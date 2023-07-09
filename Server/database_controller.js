const mysql = require('mysql');
const config = require('./config')

const db = mysql.createConnection(config.MySQLConnectionOption);

db.connect((err) => {
  if (err) {
    console.log(err)
  }
  console.log('Connected to MySQL database!');
});

// db.query(`
//   CREATE TABLE IF NOT EXISTS Devices (
//     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     Hostname VARCHAR(255) NOT NULL,
//     Time_Stamp VARCHAR(255) NOT NULL,
//     CPU_Usage VARCHAR(255) NOT NULL,
//     Memory_Usage VARCHAR(255) NOT NULL,
//     Swap_Usage VARCHAR(255) NOT NULL,
//     Disk_Usage VARCHAR(255) NOT NULL,
//     Network_Usage VARCHAR(255) NOT NULL,
//     Package_Loss_Rate VARCHAR(255) NOT NULL,
//     System_Info VARCHAR(255) NOT NULL
//   )
// `, (err) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log('Table created!');

// db.query(`
//   CREATE TABLE IF NOT EXISTS Users (
//     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     Username VARCHAR(255) NOT NULL,
//     Password VARCHAR(255) NOT NULL,
//     Permission VARCHAR(255) NOT NULL,
//     Department VARCHAR(255) NOT NULL,
//     Father VARCHAR(255) NOT NULL
//   )
// `, (err) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log('Table created!');

// });

// db.query(`
//   INSERT INTO Users (id, Username, Password, Permission, Department, Father) VALUES (?, ?, ?, ?, ?, ?)
// `, [0, "root", "admin", "root", "root", "NULL"], (err) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log('Table created!');
// });

// db.query(`SELECT * FROM Devices`, (err, results, fields) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log(results);
// });

// db.query(`SELECT * FROM Devices`, (err, results, fields) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log(results);
// });

// const query = `
//     SELECT t1.* FROM Devices t1
//     INNER JOIN (
//         SELECT Hostname, MAX(Time_Stamp) AS max_timestamp
//         FROM Devices
//         GROUP BY Hostname
//     ) t2
//     ON t1.Hostname = t2.Hostname AND t1.Time_Stamp = t2.max_timestamp;
//   `;

// const query = `
//   SELECT t1.System_Info, t1.Time_Stamp FROM Devices t1
//   INNER JOIN (
//       SELECT Hostname, MAX(Time_Stamp) AS max_timestamp
//       FROM Devices
//       GROUP BY Hostname
//   ) t2
//   ON t1.Hostname = t2.Hostname AND t1.Time_Stamp = t2.max_timestamp;
// `;

const Hostname = 'DESKTOP-I6JAGL6'
const query = `
    SELECT * FROM Devices
    WHERE Hostname = '${Hostname}'
    ORDER BY Time_Stamp DESC
    LIMIT 1;
    `;

db.query(query, (error, results, fields) => {
  if (error) {
    console.error('Error executing query: ' + error.stack);
    return;
  }
  console.log('Query results:', results);
});