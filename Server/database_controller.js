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
//     Disk_Usage VARCHAR(5000) NOT NULL,
//     Network_Usage VARCHAR(255) NOT NULL,
//     Package_Loss_Rate VARCHAR(255) NOT NULL,
//     System_Info VARCHAR(5000)
//   )
// `, (err) => {
//   if (err) {
//     console.log(err)
//     throw err;
//   }
//   console.log('Table created!');
// })

// db.query(`
//   DROP TABLE Devices ;
// `, (err) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log('Table dropped!');
// })

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

// const Hostname = 'DESKTOP-I6JAGL6'
// const query = `
//     SELECT * FROM Devices
//     WHERE Hostname = '${Hostname}'
//     ORDER BY Time_Stamp DESC
//     LIMIT 1;
//     `;

// db.query(query, (error, results, fields) => {
//   if (error) {
//     console.error('Error executing query: ' + error.stack);
//     return;
//   }
//   var data = results
//   const time_now = new Date()
//   for (let i = 0; i < data.length; i++) {
//     console.log((time_now - 1))
//     console.log(parseInt(data[i]['Time_Stamp']) / 1000000)
//     if ((time_now - parseInt(data[i]['Time_Stamp']) / 1000000) > 30 * 1000) {
//       //未存活，5min
//       data[i]['live'] = 0
//     }
//     else {
//       //存活
//       data[i]['live'] = 1
//     }
//   }
//   console.log('Query results:', data);
// });

// db.query(`SELECT * FROM Users`, (err, results, fields) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log(results);
// });

// db.query(`
//   CREATE TABLE IF NOT EXISTS Devices_System (
//     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//     Hostname VARCHAR(255) NOT NULL,
//     Time_Stamp VARCHAR(255) NOT NULL,
//     OS_Name VARCHAR(255) NOT NULL,
//     OS_Version VARCHAR(255) NOT NULL,
//     OS_Arch VARCHAR(255) NOT NULL,
//     CPU_Name VARCHAR(255) NOT NULL,
//     RAM VARCHAR(255) NOT NULL
//   )
// `, (err) => {
//   if (err) {
//     console.log(err)
//     //throw err;
//   }
//   console.log('Table created!');
// }
// )

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
        console.error('Error executing query: ' + error.stack);
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
        console.log(results)
    }
});

// Hostname = "DESKTOP-I6JAGL6"
// const query = `SELECT * FROM Devices WHERE Hostname = ?`
// db.query(query, Hostname, (err, rows) => {
//     if (err) {
//         console.log(err)
//     }
//     else {
//         console.log(rows)
//     }
// });