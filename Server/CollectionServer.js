const express = require('express');
const compression = require('compression');
const mysql = require('mysql')
const config = require('./config');
const bodyParser = require('body-parser');
const cors = require('cors')
const session = require('express-session');

const db_pool = mysql.createPool(config.MySQLConnectionOption);
db = db_pool.getConnection((err, connection) => {
    if (err) {
        LogMsg(`Error while getting connection from pool: ${err}`)
        return;
    }
});

const port = process.env.port || process.env.PORT || 10086

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(compression());
app.use(cors());
app.options('*', cors());


var FileStore = require('session-file-store')(session);
var sessionMiddleware = session({
    secret: '123456',
    store: new FileStore(),
    cookie: {
        path: '/',
        httpOnly: true,
        secure: false,
        maxAge: 600000
    },
    resave: true,
    saveUninitialized: true,
    status: true,//登录状态
})
app.use(sessionMiddleware);

const agentRouter = new express.Router()
const adminRouter = new express.Router()

function LogMsg(msg) {
    let date = new Date()
    console.log(`[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]${msg}`);
}

//提供给agent，上传设备信息
agentRouter.post('/report', (req, res) => {
    LogMsg("接收设备信息")
    const body = req.body;
    //处理磁盘利用率
    var total = 0;
    var total_Used = 0;
    for (let key in body["Disk Usage"]) {
        console.log(total)
        total_Used += Number.parseFloat(body["Disk Usage"][key]["Used"].replace("GB", ""))
        total += Number.parseFloat(body["Disk Usage"][key]["Total"].replace("GB", ""))
    }
    Used_Rate = total_Used / total;
    var Used_Rate = Math.round(parseInt(Used_Rate * 1000)) / 10

    //发出CPU警告
    if (parseFloat(body['CPU Usage']) > 0.1){
        sio.emit("trap", {'type': "CPU_HIGH", 'data': body})
    }

    //存入数据库
    db.query(`INSERT INTO Devices (Hostname, Time_Stamp, CPU_Usage, Memory_Usage, Swap_Usage, Disk_Usage, Network_Usage, Package_Loss_Rate, System_Info) VALUES(?,?,?,?,?,?,?,?,?)`,
        [body["System Info"]["Hostname"], body["Time Stamp"], body["CPU Usage"], body["Memory Usage"], body["Swap Usage"],
            Used_Rate, body["Network Usage"], body["Package Loss Rate"], JSON.stringify(body["System Info"])], (err, result) => {
                if (err) throw err;
                console.log(result);
            });
    LogMsg("设备信息存储成功")
    return res.send('{success: true}');
})

//提供给manager，登录
adminRouter.post('/login', (req, res) => {
    const username = req.body.username
    const password = req.body.password
    LogMsg(`处理登录请求：${username}`)

    // 处理请求数据并返回响应结果
    db.query("SELECT * FROM Users WHERE username = ?", [username], function (err, row) {
        LogMsg("正在查询数据库......")
        if (err) {
            LogMsg(err)
            return;
        }
        if (row == undefined) {
            // res.send("用户名不存在， 请注册账户");
            LogMsg("登录失败，用户名不存")
            return res.status(403).send({ success: false, msg: '用户或密码错误' });
        }
        else {
            if (row.password != password) {
                LogMsg("登录失败，密码错误")
                return res.status(403).send({ success: false, msg: '用户或密码错误' });
            }
            else {
                //登陆成功建立会话
                LogMsg(`登录成功：${username}"`)
                req.session.username = username;
                return res.status(200).send({ success: true, msg: '登录成功' });
            }
        }
    })
})

//查询某设备详细信息，pass中
adminRouter.post('/status_single', (req, res) => {
    const Hostname = JSON.parse(req.Hostname)
    //查询单个设备最新数据
    const query = `
    SELECT * FROM Devices
    WHERE Hostname = '${Hostname}'
    ORDER BY Time_Stamp DESC
    LIMIT 1;
    `;
    db.query(query, (error, results, fields) => {
        if (error) {
            // console.error('Error executing query: ' + error.stack);
            LogMsg('Error executing query: ' + error.stack)
            return res.status(200).send({ success: false, msg: '查询失败' });;
        }
        LogMsg("成功查询所有设备概略信息")
        return res.status(200).send({ success: true, msg: '查询成功', results });
    });
})

//查询所有设备的信息
adminRouter.get('/status_all', (req, res) => {
    //查询每一个设备时间戳最新的 系统信息和时间戳
    const query = `
    SELECT t1.System_Info, t1.Time_Stamp FROM Devices t1
    INNER JOIN (
        SELECT Hostname, MAX(Time_Stamp) AS max_timestamp
        FROM Devices
        GROUP BY Hostname
    ) t2
    ON t1.Hostname = t2.Hostname AND t1.Time_Stamp = t2.max_timestamp;
  `;
    db.query(query, (error, results, fields) => {
        if (error) {
            // console.error('Error executing query: ' + error.stack);
            LogMsg('Error executing query: ' + error.stack)
            return res.status(200).send({ success: false, msg: '查询失败' });;
        }

        var data = results
        const time_now = new Date()
        for (let i = 0; i < data.length; i++) {
            if ((time_now - parseInt(data[i]['Time_Stamp']) / 1000000) > 30 * 1000) {
                //未存活，5min
                data[i]['live'] = 1
            }
            else {
                //存活
                data[i]['live'] = 1
            }
        }
        LogMsg("成功查询所有设备概略信息")
        LogMsg(JSON.stringify(results))
        return res.status(200).send({ success: true, msg: '查询成功', results });
    });
})

app.use('/', agentRouter);
app.use('/admin', adminRouter);
server = app.listen(port, () => {
    console.log('Web Server Up!')
})

const sio = require("socket.io")(server);

sio.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res, next);
});

sio.on('connection', (socket) => {
    LogMsg("用户 %s 正在连接socket", socket.request.session.username)

    //连接的确认和分配玩家位
    socket.on('ready', (data, callback) => {
        LogMsg(`用户 ${scoket.request.session.username} 连接成功`)
        //记录登录信息
        users.push({
            name: socket.request.session.username,
            socket: socket
        });
    })

    socket.on("trap", function (data) {
        data = JSON.parse(data)
    })

    //连接断开
    socket.on('disconnect', (reason) => {
        LogMsg(`Socket ${socket.id} disconnected with reason ${reason}`)
    });
})