const mysql = require('mysql')
var dgram = require('dgram');
const bodyParser = require('body-parser');
const config = require('./config');
const session = require('express-session');

const db = mysql.createConnection(config.MySQLConnectionOption);

db.connect((err) => {
    if (err) {
        console.log(err)
    }
    console.log('Connected to MySQL database!');
});

function LogMsg(msg) {
    let date = new Date()
    console.log(`[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]${msg}`);
}

function Scan() {
    LogMsg("扫描中")
    const promise = new Promise((resolve, reject) => {
        db.query(`SELECT *
            FROM Devices_trap t1
            JOIN Devices t2 ON t1.Hostname = t2.Hostname
            WHERE t2.Time_Stamp = (
            SELECT MAX(Time_Stamp)
            FROM Devices
            WHERE Hostname = t1.Hostname
        )`,
            (err, rows, fields) => {
                if (err) {
                    LogMsg(`Scan 错误: ${JSON.stringify(err)}`)
                    return
                }
                // LogMsg(JSON.stringify(rows))
                for (let i = 0; i < rows.length; i++) {
                    // if (parseFloat(rows[i]["CPU Usage"]) > parseFloat(rows[i]["CPU"])) {
                    if (parseFloat(rows[i]["CPU_Usage"]) > parseFloat(rows[i]["CPU"])) {
                        var SendBuff = { type: "CPU_high", Hostname: rows[i]["Hostname"], data: rows[i]['CPU_Usage'] }
                        resolve(SendBuff)

                    }
                    //发出Memory警告
                    if (parseFloat(rows[i]["Memory_Usage"]) > parseFloat(rows[i]["Memory"])) {
                        var SendBuff = { type: "Memory_high", Hostname: rows[i]["Hostname"], data: rows[i]['Memory_Usage'] }
                        resolve(SendBuff)
                    }
                    //发出Network警告
                    if (parseFloat(rows[i]["Network_Usage"]) > parseFloat(rows[i]["Net"])) {
                        var SendBuff = { type: "Network_high", Hostname: rows[i]["Hostname"], data: parseFloat(rows[i]['Network_Usage']) }
                        resolve(SendBuff)
                    }
                }
                reject()
            })

    }).then((SendBuff) => {
        db.query(`SELECT session_data FROM session`, (err, session_list) => {
            if (err) {
                LogMsg(`查找需发送trap对象错误: ${JSON.stringify(err)}`)
                return
            }
            for (let i = 0; i < session_list.length; i++) {
                data = JSON.parse(session_list[i]["session_data"])
                if (data["ip"]) {
                    // LogMsg(JSON.stringify(data))
                    Send(JSON.stringify(SendBuff), data["ip"])
                }
            }
        })
    }).catch((error)=>{
        return
    })
}

function Send(SendBuff, ip) {
    var udp_client = dgram.createSocket('udp6');
    SendLen = SendBuff.length
    LogMsg(`发送trap报文: ${SendBuff}, ip: ${ip}`)
    udp_client.send(SendBuff, 0, SendLen, 10087, ip);
}

myid = setInterval(Scan, 5000);

