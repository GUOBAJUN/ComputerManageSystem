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

class ReportThread(QThread):
    def __init__(self, agent:Agent.CollectingAgent | None = ...,parent: QObject | None = ...) -> None:
        super().__init__()
        self.agent = agent
    
    def run(self):
        self.agent.report_system_status()
    
    def cancel(self):
        self.agent.cancelled = True



class MainWindow(AcrylicWindow, Ui_Mainwindow):
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
        self.report_thread = ReportThread(agent=self.agent)
        # 设置周期性时钟
        self.report_timer = QTimer(self)
        self.report_timer.timeout.connect(self.BackgroundWorker)
        self.report_timer.start(10000)

    def BackgroundWorker(self):
        self.report_thread.start()
    
    def closeEvent(self, e):
        return super().closeEvent(e)
    


if __name__ == '__main__':
    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps)

    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    tray = TrayIcon(window)
    tray.show()
    sys.exit(app.exec_())
