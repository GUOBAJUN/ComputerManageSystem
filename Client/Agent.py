import json
import os
import platform
import threading
import time

import keyboard
import psutil
import requests
import win32api
import win32con
import win32gui
import win32gui_struct

MASTER = 'http://127.0.0.1:10086/report'
global Signal
Signal = True


# 创建任务栏角标
class SysTrayIcon(object):
    QUIT = 'QUIT'
    SPECIAL_ACTIONS = [QUIT]
    FIRST_ID = 1023

    def __init__(self, hover_text, on_quit=None, default_menu_index=None, window_class_name=None) -> None:
        self.hover_text = hover_text
        self.on_quit = on_quit
        menu_options = (('退出', None, self.QUIT),)
        self._next_action_id = self.FIRST_ID
        self.menu_actions_by_id = set()
        self.menu_options = self._add_ids_to_menu_options(list(menu_options))
        self.menu_actions_by_id = dict(self.menu_actions_by_id)
        del self._next_action_id

        self.default_menu_index = (default_menu_index or 0)
        self.window_class_name = window_class_name or 'System Status Collecting Agent'

        message_map = {win32gui.RegisterWindowMessage('TaskbarCreated'): self.restart,
                       win32con.WM_DESTROY: self.destroy,
                       win32con.WM_COMMAND: self.command,
                       win32con.WM_USER+20: self.notify}

        window_class = win32gui.WNDCLASS()
        hinst = window_class.hInstance = win32gui.GetModuleHandle(None)
        window_class.lpszClassName = self.window_class_name
        window_class.style = win32con.CS_VREDRAW | win32con.CS_HREDRAW
        window_class.hCursor = win32gui.LoadCursor(0, win32con.IDC_ARROW)
        window_class.hbrBackground = win32con.COLOR_WINDOW
        window_class.lpfnWndProc = message_map
        classAtom = win32gui.RegisterClass(window_class)

        style = win32con.WS_OVERLAPPED | win32con.WS_SYSMENU
        self.hwnd = win32gui.CreateWindow(classAtom,
                                          self.window_class_name,
                                          style,
                                          0,
                                          0,
                                          win32con.CW_USEDEFAULT,
                                          win32con.CW_USEDEFAULT,
                                          0,
                                          0,
                                          hinst,
                                          None)
        win32gui.UpdateWindow(self.hwnd)
        self.notify_id = None
        self.refresh_icon()
        win32gui.PumpMessages()

    def _add_ids_to_menu_options(self, menu_options) -> list:
        result = []
        for menu_option in menu_options:
            (option_text, option_icon, option_action) = menu_option
            if callable(option_action) or option_action in self.SPECIAL_ACTIONS:
                self.menu_actions_by_id.add(
                    (self._next_action_id, option_action))
                result.append(menu_option + (self._next_action_id,))
            elif non_string_iterable(option_action):
                result.append((option_text,
                               option_icon,
                               self._add_ids_to_menu_options(option_action),
                               self._next_action_id))
            else:
                print('Unkown item when adding menu options')
            self._next_action_id += 1
        return result

    def refresh_icon(self):
        hinst = win32gui.GetActiveWindow()
        hicon = win32gui.LoadIcon(0, win32con.IDI_APPLICATION)

        if self.notify_id:
            message = win32gui.NIM_MODIFY
        else:
            message = win32gui.NIM_ADD
        self.notify_id = (self.hwnd,
                          0,
                          win32gui.NIF_ICON | win32gui.NIF_MESSAGE | win32gui.NIF_TIP,
                          win32con.WM_USER+20,
                          hicon,
                          self.hover_text)
        win32gui.Shell_NotifyIcon(message, self.notify_id)

    def restart(self, hwnd, msg, wparam, lparam):
        self.refresh_icon()

    def destroy(self, hwnd, msg, wparam, lparam):
        if self.on_quit:
            self.on_quit()
        nid = (self.hwnd, 0)
        win32gui.Shell_NotifyIcon(win32gui.NIM_DELETE, nid)
        win32gui.PostQuitMessage(0)

    def notify(self, hwnd, msg, wparam, lparam):
        if lparam == win32con.WM_LBUTTONDBLCLK:
            self.execute_menu_option(self.default_menu_index+self.FIRST_ID)
        elif lparam == win32con.WM_RBUTTONUP:
            self.show_menu()
        elif lparam == win32con.WM_LBUTTONUP:
            pass
        return True

    def show_menu(self):
        menu = win32gui.CreatePopupMenu()
        self.create_menu(menu, self.menu_options)
        pos = win32gui.GetCursorPos()
        win32gui.SetForegroundWindow(self.hwnd)
        win32gui.TrackPopupMenu(menu,
                                win32con.TPM_LEFTALIGN,
                                pos[0],
                                pos[1],
                                0,
                                self.hwnd,
                                None)
        win32gui.PostMessage(self.hwnd, win32con.WM_NULL, 0, 0)

    def create_menu(self, menu, menu_options):
        for option_text, option_icon, option_action, option_id in menu_options[::-1]:
            if option_icon:
                option_icon = self.prep_menu_icon(option_icon)
            if option_id in self.menu_actions_by_id:
                item, extras = win32gui_struct.PackMENUITEMINFO(text=option_text,
                                                                hbmpItem=option_icon,
                                                                wID=option_id)
                win32gui.InsertMenuItem(menu, 0, 1, item)
            else:
                submenu = win32gui.CreatePopupMenu()
                self.create_menu(submenu, option_action)
                item, extras = win32gui_struct.PackMENUITEMINFO(text=option_text,
                                                                hbmpItem=option_icon,
                                                                hSubMenu=submenu)
                win32gui.InsertMenuItem(menu, 0, 1, item)

    def prep_menu_icon(self, icon):
        icon_x = win32api.GetSystemMetrics(win32con.SM_CXSMICON)
        icon_y = win32api.GetSystemMetrics(win32con.SM_CYSMICON)
        hicon = win32gui.LoadImage(
            0, icon, win32con.IMAGE_ICON, icon_x, icon_y, win32con.LR_LOADFROMFILE)
        hdcBitmap = win32gui.CreateCompatibleDC(0)
        hdcScreen = win32gui.GetDC(0)
        hbm = win32gui.CreateCompatibleBitmap(hdcScreen, icon_x, icon_y)
        hbmOld = win32gui.SelectObject(hdcBitmap, hbm)
        brush = win32gui.GetSysColorBrush(win32con.COLOR_MENU)
        win32gui.FillRect(hdcBitmap, (0, 0, 16, 16), brush)
        win32gui.DrawIconEx(hdcBitmap, 0, 0, hicon, icon_x,
                            icon_y, 0, 0, win32con.DI_NORMAL)
        win32gui.SelectObject(hdcBitmap, hbmOld)
        win32gui.DeleteDC(hdcBitmap)
        return hbm

    def command(self, hwnd, msg, wparam, lparam):
        id = win32gui.LOWORD(wparam)
        self.execute_menu_option(id)

    def execute_menu_option(self, id):
        menu_action = self.menu_actions_by_id[id]
        if menu_action == self.QUIT:
            win32gui.DestroyWindow(self.hwnd)
        else:
            menu_action(self)


def non_string_iterable(obj):
    try:
        iter(obj)
    except TypeError:
        return False
    else:
        return not isinstance(obj, str)
# 获取系统信息


def get_system_info():
    system_info = {}
    system_info['OS Name'] = platform.system()
    system_info['OS version'] = platform.version()
    system_info['OS Arch'] = platform.architecture()[0]
    system_info['Hostname'] = platform.node()
    return system_info


# 在网络错误的情况下暂存采集的数据
def data_dump(info: dict):
    if not os.path.exists('dump'):
        os.mkdir('dump')
    with open(f'dump/{info["Time Stamp"]}.json','w',encoding='utf-8') as fp:
        json.dump(info, fp)
    pass


# 在网络恢复后重传本地保存的数据
def dump_report():
    pass


# 报告设备运行状态
def report_hardware_info():
    print('Collecting Infomation...')
    info = {}
    info['Time Stamp'] = time.time_ns()
    info['CPU Usage'] = psutil.cpu_percent(interval=2)
    info['Memory Usage'] = f"{psutil.virtual_memory().percent}"
    info['Swap Usage'] = f"{psutil.swap_memory().percent}"
    disk_info = {}
    disks = psutil.disk_partitions()
    for disk in disks:
        mount_point = disk.mountpoint
        if os.name == 'nt':
            mount_point = mount_point.replace('\\', '/')
        usage = psutil.disk_usage(disk.mountpoint)
        disk_info[mount_point] = {}
        disk_info[mount_point]['Total'] = f"{round(usage.total/1024/1024/1024,2)}GB"
        disk_info[mount_point]['Used'] = f"{round(usage.used/1024/1024/1024,2)}GB"
        disk_info[mount_point]['Free'] = f"{round(usage.free/1024/1024/1024,2)}GB"
        disk_info[mount_point]['Disk Usage'] = f"{usage.percent}"
    info['Disk Usage'] = disk_info
    network_io_counters1 = psutil.net_io_counters()
    time.sleep(1)
    network_io_counters2 = psutil.net_io_counters()
    network_sent = network_io_counters2.bytes_sent - network_io_counters1.bytes_sent
    network_recv = network_io_counters2.bytes_recv - network_io_counters1.bytes_recv
    total_bytes = network_sent + network_recv
    network_speed = 0
    for interface, stats in psutil.net_if_stats().items():
        if stats.isup:
            network_speed += stats.speed * 1024 * 1024
    info['Network Usage'] = f"{round(total_bytes / network_speed * 100, 2)}"
    if network_io_counters2.packets_sent-network_io_counters1.packets_sent:
        info['Package Loss Rate'] = f"{round((network_io_counters2.dropin - network_io_counters1.dropin +network_io_counters2.dropout - network_io_counters1.dropout + network_io_counters2.errout - network_io_counters1.errout)/(network_io_counters2.packets_sent-network_io_counters1.packets_sent), 2)}"
    else:
        info['Package Loss Rate'] = 0.00
    info['System Info'] = get_system_info()
    print('Collected!')
    headers = {'Content-Type': 'application/json'}
    i = 0
    while i < 11:
        try:
            response = requests.post(
                url=MASTER, headers=headers, data=json.dumps(info))
            if response.status_code == 200:
                print('Successfully report system state to master node.')
                break
            else:
                print('An error occurred when sending system state.')
                if Signal == False:
                    print('Subthread is asked to terminate. Data will be dumped to dump folder.')
                    data_dump(info)
                    exit(0)
                print(f'We will try for {10-i} more time(s).')
                time.sleep(0.5)
        except:
            print('Network error! Unable to report system state.')
            if Signal == False:
                print('Subthread is asked to terminate. Data will be dumped to dump folder.')
                data_dump(info)
                exit(0)
            print(f'We will try for {10-i} more time(s).')
            time.sleep(0.5)
        i += 1
    if i > 10:
        print('Failed to report system state.')
        print('System state collected as follows:')
        print(info)
        print('Data will be dumped to dump folder.')
        data_dump(info)


# 回报状态子线程函数
def reportHelper():
    while Signal:
        report_hardware_info()
        time.sleep(10)


if __name__ == '__main__':
    report_thread = threading.Thread(target=reportHelper)
    report_thread.start()
    hover_text = 'System Status Collecting Agent'
    SysTrayIcon(hover_text)
    Signal = False
    print('Wait until the subthread terminates.')
    report_thread.join()
    print('Agent will stop.')
