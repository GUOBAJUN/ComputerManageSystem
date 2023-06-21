import Agent
import time

if __name__ == '__main__':
    agent = Agent.CollectingAgent('http://127.0.0.1/report')
    while True:
        agent.get_system_info()
        time.sleep(10)