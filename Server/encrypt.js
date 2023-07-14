const crypto = require('crypto');
// 签名对象
let obj = crypto.createHash('md5');
// 加密数据
obj.update('12345');
// 以十六进制返回结果
let str = obj.digest('hex');
console.log(str);
 
 
// // 将MD5封装成一个方法
// const crypto = require('crypto');
// module.exports = {
// 	let obj = crypto.createHash('md5');
// 	obj.update(str);
// 	return obj.digest('hex');
// }