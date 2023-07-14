const express = require('express');
const compression = require('compression');
const mysql = require('mysql')
const config = require('./config');
const bodyParser = require('body-parser');
const cors = require('cors')
const session = require('express-session');

const db = mysql.createConnection(config.MySQLConnectionOption);

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

//提供给manager, 登录
adminRouter.post('/login', (req, res) => {
    const username = req.body.Account
    const password = req.body.Password
    LogMsg(`处理登录请求：账号：${username} 密码：${password}`,)

    // 处理请求数据并返回响应结果
    db.query("SELECT * FROM Users WHERE Username = ?", [username], function (err, rows) {
        LogMsg("正在查询数据库......")
        if (err) {
            LogMsg(`查询出现错误: ${err}`)
            return res.status(403).send({ success: false, msg: '查询错误' });;
        }
        if (rows == undefined || rows == "") {
            LogMsg(`登录失败，用户名${username}不存在`)
            return res.status(403).send({ success: false, msg: '用户或密码错误' });
        }
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].Password == password) {
                LogMsg(`登录成功，账号：${username} 密码：${password}`)
                req.session.username = username;
                return res.status(200).send({ success: true, msg: '登录成功' });
            }
        }
        LogMsg("登录失败，密码错误")
        return res.status(403).send({ success: false, msg: '用户或密码错误' });
    })
})

//提供给agent, 上传设备信息
agentRouter.post('/report/performance', (req, res) => {
    LogMsg("接收设备信息:performance")
    const body = req.body;
    LogMsg(body)

    //发出CPU警告
    if (parseFloat(body['CPU Usage']) > 0.1) {
        sio.emit("trap", { 'type': "CPU_HIGH", 'data': body })
    }

    //存入数据库
    db.query(`INSERT INTO Devices (Hostname, Time_Stamp, CPU_Usage, Memory_Usage, Swap_Usage, Disk_Usage, Network_Usage, Package_Loss_Rate, System_Info) VALUES(?,?,?,?,?,?,?,?,?)`,
        [body["System Info"]["Hostname"], body["Time Stamp"], body["CPU Usage"], body["Memory Usage"], body["Swap Usage"],
        body["Disk Usage"], body["Network Usage"], body["Package Loss Rate"], JSON.stringify(body["System Info"])], (err, result) => {
            if (err) {
                LogMsg(err)
                return res.status(403).send('{seccess: false}');
            }
            LogMsg(result);
        });
    LogMsg("设备信息存储成功")
    return res.status(200).send('{success: true}');
})

//提供给agent, 上传设备信息
agentRouter.post('/report/systeminfo', (req, res) => {
    LogMsg("接收设备信息:systeminfo")
    const body = req.body;
    LogMsg(`接收系统信息：${body}`)
    //查询旧数据
    db.query("SELECT * FROM Devices_System WHERE Username = ?", [body['Hostname']], function (err, rows) {
        LogMsg("正在查询系统信息数据库......")
        if (err) {
            LogMsg(`查询系统数据出现错误: ${err}`)
            return res.status(403).send({ success: false, msg: '失败' });;
        }
        if (rows == undefined || rows == "") {
            LogMsg(`设备：${body['Hostname']}未录入系统，正在录入系统数据库`)
            db.query(`INSERT INTO Devices_System (Hostname, Time_Stamp, OS_Name, OS_Version, OS_Arch, CPU_Name, RAM) VALUES(?,?,?,?,?,?,?)`,
                [body["Hostname"], body["Time_Stamp"], body["OS_Name"], body["OS_Version"], body["OS_Arch"],
                body["CPU_Name"], body["RAM"]], (err, result) => {
                    if (err) throw err;
                    LogMsg(result);
                });
            return res.status(200).send({ success: false });
        }
        else {
            db.query(`UPDATE Devices_System SET 
            Time_Stamp = ${body["Time_Stamp"]}, OS_Name = ${body["OS_Name"]}, OS_Version = ${body["OS_Version"]}, 
            OS_Arch  ${body["OS_Arch"]}, CPU_Name = ${body["CPU_Name"]}, RAM = ${body["RAM"]} WHERE Hostname = ${body["Hostname"]} `,
                (err, result) => {
                    if (err) throw err;
                    LogMsg(result);
                });
            LogMsg(`系统:${body["Hostname"]}信息更新成功`)
            return res.status(200).send({ success: false });
        }
    })

    //存入数据库

    LogMsg("设备信息存储成功")
    return res.send('{success: true}');
})



//查询某设备详细信息，pass中
adminRouter.post('/status_single', (req, res) => {
    if (!req.session.username) {
        return res.status(403).send({ success: false, msg: '未登录' });
    }
    const Hostname = req.body.Hostname
    LogMsg(JSON.stringify(req.body))
    LogMsg(`查询:${Hostname}`)
    //查询单个设备最新数据
    const query = `
    SELECT * FROM Devices
    WHERE Hostname = '${Hostname}'
    ORDER BY Time_Stamp DESC
    LIMIT 10;
    `;
    db.query(query, (error, results, fields) => {
        if (error) {
            // console.error('Error executing query: ' + error.stack);
            LogMsg('Error executing query: ' + error.stack)
            return res.status(403).send({ success: false, msg: '查询失败' });;
        }
        if (results == undefined || results == "") {
            LogMsg(`查询失败，设备： ${Hostname}不存在`)
            return res.status(403).send({ success: false, msg: '设备不存在' });
        }
        LogMsg(`成功查询设备：${Hostname} 信息：${JSON.stringify(results)}`)
        return res.status(200).send({ success: true, msg: '查询成功', results });
    });
})

//查询所有设备的信息
adminRouter.get('/status_all', (req, res) => {
    //查询每一个设备时间戳最新的 系统信息和时间戳
    if (!req.session.username) {
        return res.status(403).send({ success: false, msg: '未登录' });
    }
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
            return res.status(403).send({ success: false, msg: '查询失败' });;
        }
        const time_now = new Date()
        for (let i = 0; i < results.length; i++) {
            if ((time_now - parseInt(results[i]['Time_Stamp']) / 1000000) > 30 * 1000) {
                //未存活，5min
                results[i]['live'] = 0
            }
            else {
                //存活
                results[i]['live'] = 1
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
        LogMsg(`用户 ${scoket.request.session.user} 连接成功`)
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