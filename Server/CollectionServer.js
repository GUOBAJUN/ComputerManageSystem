const express = require('express');
const compression = require('compression');
const mysql = require('mysql')
const config = require('./config');
const bodyParser = require('body-parser');
const cors = require('cors')

const db = mysql.createConnection(config.MySQLConnectionOption);
const port = process.env.port || process.env.PORT || 10086

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(compression());
app.use(cors());
app.options('*', cors());

const router = new express.Router()

router.post('/report', (req, res) => {
    const body = req.body;
    //处理磁盘利用率
    var total = 0;
    var total_Used = 0;
    for (let key in body["Disk Usgae"]){
        console.log(total)
        total_Used += Number.parseFloat(body["Disk Usgae"][key]["Used"].replace("GB", ""))
        total += Number.parseFloat(body["Disk Usgae"][key]["Total"].replace("GB", ""))
    }
    Used_Rate = total_Used/total;
    console.log("磁盘总利用率：")
    console.log(Used_Rate)
    //存入数据库
    db.query(`INSERT INTO Devices (Hostname, Time_Stamp, CPU_Usage, Memory_Usage, Swap_Usage, Disk_Usage, Network_Usage, Package_Loss_Rate, System_Info) VALUES(?,?,?,?,?,?,?,?,?)`,
    [body["System Info"]["Hostname"], body["Time Stamp"], body["CPU Usage"], body["Memory Usage"], body["Swap Usage"], 
        Used_Rate, body["Network Usage"], body["Package Loss Rate"], JSON.stringify(body["System Info"])],(err,result)=>{
        if(err) throw err;
        console.log(result);
        });
    return res.send('{success: true}');
})

app.use('/', router);
app.listen(port, ()=>{
    console.log('Web Server Up!')
})