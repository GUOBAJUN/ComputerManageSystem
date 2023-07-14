import os
import sys
import typing

from PyQt5.QtCore import QObject, Qt, QTimer, QThread, pyqtSignal
from PyQt5.QtGui import QIcon
from PyQt5.QtWidgets import QApplication
from qfluentwidgets import setThemeColor
from qframelesswindow import AcrylicWindow, StandardTitleBar

import Agent
from AgentTray import TrayIcon
from UI.Ui_mainwindow import Ui_Mainwindow

path = os.path.abspath(__file__)
filePath = os.path.dirname(path)


class BackgroundWorker(QThread):
    def __init__(self, agent: Agent.CollectingAgent | None = ..., parent: QObject | None = ...) -> None:
        super().__init__()
        self.agent = agent
        self.performance_timer = QTimer(self)
        self.performance_timer.timeout.connect(self.agent.report_performance)
        self.systeminfo_timer = QTimer(self)
        self.systeminfo_timer.timeout.connect(self.agent.report_system_info)

    def run(self):
        self.agent.report_system_info()
        self.agent.report_performance()
        self.performance_timer.start(10*1000)
        self.systeminfo_timer.start(30*24*60*60*1000)

    def cancel(self):
        self.agent.cancelled = True


class MainWindow(Ui_Mainwindow, AcrylicWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setupUi(self)

        # 设置主题色
        setThemeColor('#60bb50')

        # 设置标题栏
        self.setTitleBar(StandardTitleBar(self))
        self.titleBar.raise_()
        self.setWindowIcon(QIcon(filePath+'/resources/icon.png'))
        self.setWindowTitle('System Status Collecting Agent')

        # 创建Agent实例
        self.agent = Agent.CollectingAgent('http://127.0.0.1/report')
        self.worker = BackgroundWorker(agent=self.agent)

        # 启动BackgroundWorker
        self.worker.start()


    def EditBtn_Clicked(self):
        self.Addr_TextEdit.setEnabled(True)
        self.Port_TextEdit.setEnabled(True)

    def closeEvent(self, e):
        return super().closeEvent(e)


if __name__ == '__main__':
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps)

    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    tray = TrayIcon(window)
    tray.show()
    sys.exit(app.exec_())
