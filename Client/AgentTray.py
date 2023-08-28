from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtWidgets import QApplication
import os
import sys


path = os.path.abspath(__file__)
filePath = os.path.dirname(path)

class TrayIcon(QtWidgets.QSystemTrayIcon):
    def __init__(self, Mainwindow, parent=None):
        super(TrayIcon, self).__init__(parent)
        self.ui = Mainwindow
        self.createMenu()
    
    def createMenu(self):
        self.menu = QtWidgets.QMenu()
        self.quitAction = QtWidgets.QAction('退出', self, triggered=self.quit)

        self.menu.addAction(self.quitAction)
        self.setContextMenu(self.menu)

        self.setIcon(QtGui.QIcon(filePath+'/resources/icon.png'))
        self.icon = self.MessageIcon()

        self.activated.connect(self.onIconClicked)

    def quit(self):
        QtWidgets.qApp.quit()

    def onIconClicked(self, reason):
        if reason == 2 or reason == 3:
            self.showMessage('System Status Collecting Agent', '点击退出', self.icon)
