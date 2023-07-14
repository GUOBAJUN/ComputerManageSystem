import Agent
import time
import threading

if __name__ == '__main__':
    agent = Agent.CollectingAgent('http://desktop-i6jagl6.local:10086/')
    agent.report_system_info()
    while True:
        agent.report_performance()
        time.sleep(10)
