const mysql = require('mysql');
const config = require('./config')

const db = mysql.createConnection(config.MySQLConnectionOption);

db.connect((err) => {
    if (err) {
        console.log(err)
    }
    console.log('Connected to MySQL database!');
});

db.query(`
  CREATE TABLE IF NOT EXISTS Devices (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Hostname VARCHAR(255) NOT NULL,
    Time_Stamp VARCHAR(255) NOT NULL,
    CPU_Usage VARCHAR(255) NOT NULL,
    Memory_Usage VARCHAR(255) NOT NULL,
    Swap_Usage VARCHAR(255) NOT NULL,
    Disk_Usage VARCHAR(255) NOT NULL,
    Network_Usage VARCHAR(255) NOT NULL,
    Package_Loss_Rate VARCHAR(255) NOT NULL,
    System_Info VARCHAR(255) NOT NULL
  )
`, (err) => {
  if (err) {
    console.log(err)
    //throw err;
  }
  console.log('Table created!');
});