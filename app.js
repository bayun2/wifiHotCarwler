var robot = require("./robot");
var fs = require("fs");
var argv = require("optimist").usage('Usage: $0 -t [string]')
							  .demand('t')
							  .describe('t', '城市Id,值为cf启动抓取所有免费书籍任务')
							  .argv;

if (argv.t == "cf") {
	// 北京，上海
	robot.fire({areaId:JSON.parse('["354","355"]')});
}

