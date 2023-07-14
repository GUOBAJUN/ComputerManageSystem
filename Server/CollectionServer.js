const express = require('express');
const compression = require('compression');
const mysql = require('mysql')
const config = require('./config');
const bodyParser = require('body-parser');
const cors = require('cors')
const session = require('express-session');
var dgram = require('dgram');

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

function Trap(session_list, SendBuff){
    //通过session获取ip池, 然后发送
    ip_list = []
    var SendLen = SendBuff.length;
    for (let i = session_list.length - 1; i >= 0; i--) {
        // if (!session_list[i].cookie.expires || req.session.cookie.expires < new Date()){
        //删除过期session
        if (!session_list[i].cookie.expires) {
            session_list = session_list.filter(function (item) {
                return item !== session_list[i]
            });
        }
        else{
            ip_list.append(session_list[i].ip)
        }
    }
    for (let i = 0; i < ip_list.length; i++){
        udp_client.send(SendBuff, 0, SendLen, 10087, ip_list[i]);
    }
}

session_list = []

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
                req.session.ip = req.ip
                session_list.append(req.session)
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

    //发出CPU警告
    if (parseFloat(body['CPU Usage']) > 0) {
        LogMsg(`CPU警告: ${body['CPU Usage']}`)
        var SendBuff = JSON.stringify({ type: "CPU_high", Hostname: body["Hostname"], data: body['CPU Usage'] })
        Trap(session_list, SendBuff)
    }

    //存入数据库
    db.query(`INSERT INTO Devices (Hostname, Time_Stamp, CPU_Usage, Memory_Usage, Swap_Usage, Disk_Usage, Network_Usage, Package_Loss_Rate) VALUES(?,?,?,?,?,?,?,?)`,
        [body["Hostname"], body["Time Stamp"], body["CPU Usage"], body["Memory Usage"], body["Swap Usage"],
        JSON.stringify(body["Disk Usage"]), body["Network Usage"], body["Package Loss Rate"]], (err, result) => {
            if (err) {
                LogMsg(err)
                return res.status(403).send('{seccess: false}');
            }
            else {
                LogMsg(result);
                LogMsg("设备信息存储成功")
                return res.status(200).send('{success: true}');
            }
        });
})


//提供给agent, 上传设备信息
agentRouter.post('/report/systeminfo', (req, res) => {
    const body = req.body;
    LogMsg(`接收系统信息(systeminfo)：${JSON.stringify(body)}`)
    flag = 0;
    //查询旧数据
    const promise = new Promise((resolve, reject) => {
        // 异步操作
        db.query("SELECT * FROM Devices_System WHERE Hostname = ?", [body['Hostname']], function (err, rows) {
            LogMsg("正在查询系统信息数据库......")
            if (err) {
                LogMsg(`查询系统数据出现错误: ${err}`)
                flag = 0;
                reject(flag)
            }
            if (rows == undefined || rows == "") {
                LogMsg(`设备 ${body['Hostname']} 未录入系统，准备录入系统数据库`)
                flag = 1;
                resolve(flag)
            }
            else {
                LogMsg(`设备：${body['Hostname']} 已经录入系统，准备更新数据`)
                flag = 2;
                resolve(flag)
            }
        })
    });
    // return res.status(403).send({ success: false, msg: '失败' });;

    promise.then(result => {
        if (result == 1) {
            db.query(`INSERT INTO Devices_System (Hostname, Time_Stamp, OS_Name, OS_Version, OS_Arch, CPU_Name, RAM) VALUES(?,?,?,?,?,?,?)`,
                [body["Hostname"], body["Time Stamp"], body["OS Name"], body["OS Version"], body["OS Arch"],
                body["CPU Name"], body["RAM"]], (err, result) => {
                    if (err) throw err;
                    LogMsg(result);
                });
            LogMsg(`设备:${body["Hostname"]}信息录入成功`)
            return res.status(200).send({ success: true });
        }
        //已经录入
        else if (result == 2) {
            db.query(`UPDATE Devices_System SET Time_Stamp = ?, OS_Name = ?, OS_Version = ?, 
            OS_Arch = ?, CPU_Name = ?, RAM = ? WHERE Hostname = ? `,
                [body["Time Stamp"], body["OS Name"], body["OS Version"], body["OS Arch"],
                body["CPU Name"], body["RAM"], body["Hostname"]],
                (err, result) => {
                    if (err) throw err;
                    LogMsg(JSON.stringify(result));
                });
            LogMsg(`设备: ${body["Hostname"]} 信息更新成功`)
            return res.status(200).send({ success: true });
        }
        else {
            LogMsg(`未预知的错误`)
            return res.status(403).send({ success: false });
        }
    }).catch(error => {
        LogMsg(`错误`)
        return res.status(403).send({ success: false });
    });

})


//查询某设备详细信息，pass中
adminRouter.post('/status_single', (req, res) => {
    if (!req.session.username) {
        return res.status(403).send({ success: false, msg: '未登录' });
    }
    const Hostname = req.body.Hostname
    LogMsg(JSON.stringify(req.body))
    LogMsg(`查询具体信息: ${Hostname}`)
    //查询单个设备最新数据

    const promise = new Promise((resolve, reject) => {
        // 异步操作
        const query = `SELECT * FROM Devices_System WHERE Hostname = ?`
        db.query(query, Hostname, (err, rows) => {
            if (err) {
                reject(err)
            }
            else {
                LogMsg(`查询设备系统信息成功: ${rows}`);
                resolve(rows)
            }
        });
    })
    promise.then(result => {
        const query = `
            SELECT * FROM Devices
            WHERE Hostname = '${Hostname}'
            ORDER BY Time_Stamp DESC
            LIMIT 10;
        `;
        db.query(query, (error, rows, fields) => {
            if (error) {
                // console.error('Error executing query: ' + error.stack);
                LogMsg(`${Hostname} perform数据查询失败，: ' + ${error.stack}`)
                return res.status(403).send({ success: false, msg: "查询失败" });
            }
            else if (rows == undefined || rows == "") {
                LogMsg(`${Hostname} perform数据查询失败: 不存在`)
                return res.status(403).send({ success: false, msg: "查询失败" });
            }
            else {
                LogMsg(`设备：${Hostname} performance信息查询成功`)
                // LogMsg(`设备：${Hostname} performance信息查询成功：${JSON.stringify(rows)}`)
                return res.status(200).send({ success: true, msg: "查询成功", systeminfo: result[0], results: rows });
            }
        });
    }).catch(error => {
        LogMsg(error)
        return res.status(403).send({ success: false, msg: "查询失败" });
    });
});

//查询所有设备的信息
adminRouter.get('/status_all', (req, res) => {
    //查询每一个设备时间戳最新的 系统信息和时间戳
    if (!req.session.username) {
        return res.status(403).send({ success: false, msg: '未登录' });
    }
    const query = `
    SELECT t1.Hostname, t1.Time_Stamp FROM Devices t1
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
        else {
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
            return res.status(200).send({ success: true, msg: '查询成功', results: results });
        }
    });
})

adminRouter.get('/dashboard', (req, res) => {
    //查询每一个设备时间戳最新的 系统信息和时间戳
    LogMsg("开始查询最大网络利用率")
    if (!req.session.username) {
        return res.status(403).send({ success: false, msg: '未登录' });
    }
    const query = `
    SELECT * FROM Devices t1
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
            return res.status(503).send({ success: false, msg: '查询失败' });;
        }
        else {
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

            //CPU平均使用率 //平均内存利用率 //总磁盘占用率 //最大网络利用率
            net_max = 0.0
            net_more_80 = 0
            net_less_30 = 0
            CPU_avg = 0.0
            Memory_avg = 0.0
            num = 0
            Disk_total = 0.0;
            Disk_Used = 0.0;
            for (let i = 0; i < results.length; i++) {
                //CPU平均使用率 
                //平均内存利用率
                //最大网络利用率
                if (results[i]['live'] == 1) {
                    if (parseFloat(results[i]["Network_Usage"]) > net_maxs) {
                        net_max = parseFloat(results[i]["Network_Usage"])
                    }
                    if (parseFloat(results[i]["Network_Usage"]) >= 80) {
                        net_more_80++
                    }
                    if (parseFloat(results[i]["Network_Usage"]) <= 30) {
                        net_less_30++
                    }
                    CPU_avg += parseFloat(results[i]["CPU_Usage"])
                    CPU_avg += parseFloat(results[i]["Memory_Usage"])
                    num++
                }
                //总磁盘占用率
                for (let key in results[i]["Disk Usage"]) {
                    Disk_Used += Number.parseFloat(results["Disk Usage"][key]["Used"].replace("GB", ""))
                    Disk_total += Number.parseFloat(results["Disk Usage"][key]["Total"].replace("GB", ""))
                }
                Used_Rate = total_Used / total;
                var Used_Rate = Math.round(parseInt(Used_Rate * 1000)) / 10
            }
            CPU_avg = CPU_avg / num
            Memory_avg = Memory_avg / num
            Used_Rate = Disk_Used / Disk_total;
            Used_Rate = Math.round(parseInt(Used_Rate * 1000)) / 10

            LogMsg(`成功查询仪表盘信息: Network_Usage: ${net_max}, net_more_80: ${net_more_80}, net_less_30: ${net_less_30}
                                        CPU_Usage: ${CPU_avg}, Memory_Usage: ${Memory_avg}, Disk_Usage: ${Used_Rate}, 
                                        alive: ${num}`)
            return res.status(200).send({
                success: true,
                msg: '查询成功',
                Network_Usage: net_max,
                CPU_Usage: CPU_avg,
                Memory_Usage: Memory_avg,
                Disk_Usage: Used_Rate,
                alive: num,//网络中30< <80
                net_more_80: net_more_80,
                net_less_30: net_less_30
            });
        }
    });
})

app.use('/', agentRouter);
app.use('/admin', adminRouter);
server = app.listen(port, () => {
    console.log('Web Server Up!')
})

//////////////////////------发送预警------///////////////////////////

var udp_client = dgram.createSocket('udp4');

udp_client.on('close', function () {
    console.log('udp client closed.')
})

//错误处理
udp_client.on('error', function () {
    console.log('some error on udp client.')
})

// 接收消息
udp_client.on('message', function (msg, rinfo) {
    console.log(`receive message from ${rinfo.address}:${rinfo.port}：${msg}`);
})

//定时向服务器发送消息
setInterval(function () {
    var SendBuff = 'hello 123.';
    var SendLen = SendBuff.length;
    udp_client.send(SendBuff, 0, SendLen, 5678, '172.30.20.10');
}, 3000);