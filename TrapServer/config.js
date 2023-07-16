exports.MySQLConnectionOption = {
    host: '47.98.106.205',
    port: 3306,
    user: 'root',
    connectionLimit: 10, // 连接池中最大连接数
    //保持连接
    keepAlive: true,
    password: 'Bajun20020603',
    database: 'status',
    keepAliveInitialDelay: 30000 // keep-alive的初始延迟时间（毫秒）
}