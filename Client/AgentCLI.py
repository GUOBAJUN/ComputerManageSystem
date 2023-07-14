import Agent
import time
import threading

if __name__ == '__main__':
    agent = Agent.CollectingAgent('http://192.168.43.82:10086/')
    agent.report_system_info()
    while True:
        agent.report_performance()
        time.sleep(10)