import json
import os
import platform
import time
import SystemInfo

import psutil
import requests


class CollectingAgent():
    def __init__(self, master: str) -> None:
        self.MASTER = master
        self.cancelled = False

    def report_system_info(self):
        system_info = {}
        system_info['Time Stamp'] = time.time_ns()
        system_info['OS Name'] = platform.system()
        system_info['OS Version'] = platform.version()
        system_info['OS Arch'] = platform.architecture()[0]
        system_info['Hostname'] = platform.node()
        system_info['CPU Name'] = SystemInfo.GetCpuConstants()["cpu_name"]
        system_info['RAM'] = f"{round(psutil.virtual_memory().total/1024/1024/1024,1)}GB"
        try:
            headers = {'Content-Type': 'application/json'}
            requests.post(url=self.MASTER+'report/systeminfo',
                          headers=headers, data=json.dumps(system_info))
            return True
        except:
            print("Network Error. Can't report system info!")
            return False

    def data_dump(self, info: dict):
        if not os.path.exists('dump'):
            os.mkdir('dump')
        with open(f'dump/{info["Time Stamp"]}.json', 'w', encoding='utf-8') as fp:
            json.dump(info, fp)

    def dump_report(self):
        if not os.path.exists('dump'):
            return
        files = os.listdir('dump')
        if len(files) == 0:
            return
        print('Attempting to report dumped data.')
        headers = {'Content-Type': 'application/json'}
        for file in files:
            fp = open(os.path.join('dump', file), 'r', encoding='utf-8')
            try:
                response = requests.post(url=self.MASTER+'report/performance',
                                         headers=headers,
                                         data=json.dumps(json.load(fp)))
                if response.status_code == 200:
                    fp.close()
                    os.remove(os.path.join('dump', file))
                else:
                    print('Failed to report dumped data.')
                    break
            except Exception as e:
                print(e)
                print('Failed to report dumped data.')
                break

    def report_performance(self):
        print('Collecting Infomation...')
        info = {}
        info['Hostname'] = platform.node()
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
            try:
                usage = psutil.disk_usage(disk.mountpoint)
                disk_info[mount_point] = {}
                disk_info[mount_point]['Total'] = f"{round(usage.total/1024/1024/1024,2)}GB"
                disk_info[mount_point]['Used'] = f"{round(usage.used/1024/1024/1024,2)}GB"
                disk_info[mount_point]['Free'] = f"{round(usage.free/1024/1024/1024,2)}GB"
                disk_info[mount_point]['Disk Usage'] = f"{usage.percent}"
            except:
                pass
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
        print('Collected!')
        headers = {'Content-Type': 'application/json'}
        i = 0
        while i < 11:
            try:
                print(self.MASTER+'report/performance')
                response = requests.post(
                    url=self.MASTER+'report/performance', headers=headers, data=json.dumps(info))
                if response.status_code == 200:
                    print('Successfully report system state to master node.')
                    self.dump_report()
                    return 0
                else:
                    print('An error occurred when sending system state.')
                    if self.cancelled:
                        print(
                            'Subthread is asked to terminate. Data will be dumped to dump folder.')
                        self.data_dump(info)
                        return 0
                    print(f'We will try for {10-i} more time(s).')
                    time.sleep(0.5)
            except:
                print('Network error! Unable to report system state.')
                if self.cancelled:
                    print(
                        'Subthread is asked to terminate. Data will be dumped to dump folder.')
                    self.data_dump(info)
                    exit(0)
                print(f'We will try for {10-i} more time(s).')
                time.sleep(0.5)
            finally:
                i += 1
            if i > 10:
                print('Failed to report system state.')
                print('System state collected as follows:')
                print(info)
                print('Data will be dumped to dump folder.')
                self.data_dump(info)
                return -1


if __name__ == '__main__':
    agent = CollectingAgent('http://desktop-i6jagl6.local:10086/')
    agent.report_performance()
