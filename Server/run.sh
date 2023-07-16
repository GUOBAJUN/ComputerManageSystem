docker build -t manageserver .
docker run --name manageserver -p 10086:10086 -d manageserver