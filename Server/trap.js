const mysql = require('mysql')
var dgram = require('dgram');
const bodyParser = require('body-parser');
const { error } = require('console');
const MySQLStore = require('express-mysql-session')(session)

function LogMsg(msg) {
    let date = new Date()
    console.log(`[${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}]${msg}`);
}

function Scan() {
    db.query(`SELECT *
    FROM Devices_trap t1
    INNER JOIN table2 t2 ON t1.Hostname = t2.Hostname
    ORDER BY t1.time_stamp DESC
    LIMIT 1`, 
    (err, results, fields) => {
        if (err) {
            msg = `查询trap错误: ${err}`
            reject(msg)
        }
        else {
            resolve(results)
        }
    });

    for (let i = 0; i < rows.length; i++) {
        if (parseFloat(rows[i]) > ) {
            var SendBuff = JSON.stringify({ type: "CPU_high", Hostname: body["Hostname"], data: body['CPU Usage'] })
            Trap(session_list, SendBuff)
        }
        //发出Memory警告
        if (parseFloat(body["Memory Usage"]) > 80) {
            var SendBuff = JSON.stringify({ type: "Memory_high", Hostname: body["Hostname"], data: body['Memory Usage'] })
            Trap(session_list, SendBuff)
        }
        //发出Network警告
        if (parseFloat(body["Network Usage"]) > 80) {
            var SendBuff = JSON.stringify({ type: "Network_high", Hostname: body["Hostname"], data: parseFloat(body['Network Usage']) })
            Trap(session_list, SendBuff)
        }
    }
}

function Send(SendBuff, ip) {
    var udp_client = dgram.createSocket('udp6');
    SendLen = SendBuff.length
    LogMsg(`发送trap报文: ${SendBuff}, ip: ${ip}`)
    udp_client.send(SendBuff, 0, SendLen, 10087, ip);
}

function Trap(rows) {

    //通过session获取ip池, 然后发送
    ip_list = []
    var SendLen = SendBuff.length;
    for (let i = session_list.length - 1; i >= 0; i--) {
        // if (!session_list[i].cookie.expires || req.session.cookie.expires < new Date()){
        //删除过期session
        if (!session_list[i].cookie.expires || !session_list[i].username) {
            session_list = session_list.filter(function (item) {
                return item !== session_list[i]
            });
        }
        else {
            ip_list.push(session_list[i].ip)
        }
    }
    for (let i = 0; i < ip_list.length; i++) {

    }
}

