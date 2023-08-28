exports.MySQLConnectionOption = {
    host: '127.0.0.1',  // Your MySQL server address
    port: 3306,
    user: 'root',
    connectionLimit: 10, // 连接池中最大连接数
    //保持连接
    keepAlive: true,
    password: 'Your Database Passwd',
    database: 'status',
    keepAliveInitialDelay: 30000 // keep-alive的初始延迟时间（毫秒）
}