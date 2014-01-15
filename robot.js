// wifi热点坐标抓取

var async    = require('async');
var fs       = require('fs');
var iRequest = require('request');
var targz    = require('tar.gz');
var util     = require('util');
var iconv    = require('iconv-lite');
var BufferHelper = require('bufferhelper');

var defaultConfig = {
	'homepage' : 'http://wlan.vnet.cn/',
	'wifiInfoPath' : '/map3?areaId={{areaId}}&psign=0&lang=zh',
	'pageInfoPath' : '&page=',
	'hpInfoPath' : '/hp2?hpId={{hpId}}&lang=zh&pic=red.png',
	'docDir'   : './wifi/'
}

var logWriteAble = fs.createWriteStream("./log.txt");

function robot(options, completeCallback){
	// 设置request 修改默认 userAgent
	var defaultsOptions = {
		headers : {
			'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36'
		}
	}
	var iRequestObj = iRequest.defaults(defaultsOptions);

	async.waterfall([
		function(callback) { // 根据城市id获取城市热点第一页信息
			iRequestObj(options.homepage + options.wifiInfoPath.replace('{{areaId}}', options.currentAreaId) + options.pageInfoPath + "1", 
				function(err, response, body){
					var curCityId = options.currentAreaId;
					var jsonData = JSON.parse(body.toString().replace(/\'/g, "\""));
					async.eachSeries(jsonData.hps, 
						function(item, innerCallback) {
							// 加上encoding的目的是组织默认解码为utf8
							iRequestObj({url:options.homepage + options.hpInfoPath.replace('{{hpId}}', item.id), encoding:null}, 
								function(err, res, body) {
									var hpInfoWriteAble = fs.createWriteStream(options.currentHpDir + '/' + item.id + ".json");
									console.log(typeof body);	
									hpInfoWriteAble.write(iconv.decode(body, "GBK"), function(err) {
										if(err) throw err;											
										console.log('wifi' + curCityId +'hp' + item.id + '热点信息保存成功');
										logWriteAble.write('hp' + item.id + '热点信息保存成功\n')
										innerCallback();
									})
								}
							)
						},
						function(err) {
							var curPage = jsonData.page[0].currentPage;
							var wifiInfoWriteAble = fs.createWriteStream(options.currentWifiDir + '/1.json');
							wifiInfoWriteAble.write(body, function(err){
								if(err) throw err;
								console.log('wifi' + curCityId + '第1页热点信息保存成功');
								logWriteAble.write('wifi' + curCityId + '第1页热点信息保存成功\n')
								callback(null, jsonData);
							});
						}
					)
				}
			)
		},
		function(jsonData, callback) { // 根据第一页信息，获得总页数
			// 抓取剩余页wifi信息
			logWriteAble.write(jsonData.page[0].lastPage)
			var totalPage = jsonData.page[0].lastPage;
			var pages = [];
			for(var i=2; i<=totalPage; i++) {
				pages.push(i);				
			}
			pagestirng = JSON.parse('"' + pages + '"')
			logWriteAble.write("pages:"+pagestirng+"\n")
			callback(null, pages, jsonData);
		},
		function(pages, jsonData, callback) { // 获得指定城市，剩余页数相关热点信息
			var pageIndex = 2;
			async.eachSeries(pages, 
				function(item, innerCallback) {
					iRequestObj(options.homepage + options.wifiInfoPath.replace('{{areaId}}', options.currentAreaId) + options.pageInfoPath + item, 
						function(err, response, body) {
							var curCityId =  options.currentAreaId;
							var innerJsonData = JSON.parse(body.toString().replace(/\'/g, "\""));
							logWriteAble.write('hp' + item.id + '开始请求\n')
							async.eachSeries(innerJsonData.hps, 
								function(item, innerCallback2) { // 获取热点对应的详细信息
									iRequestObj({url:options.homepage + options.hpInfoPath.replace('{{hpId}}', item.id), encoding:null}, 
										function(err, res, body) {
											logWriteAble.write('hp' + item.id + '请求中\n')
											var hpInfoWriteAble = fs.createWriteStream(options.currentHpDir + '/' + item.id + ".json");
											hpInfoWriteAble.end(iconv.decode(body, "GBK"), function(err) {
												logWriteAble.write('hp' + item.id + '写入文件\n')
												if(err) {
													logWriteAble.write("err1\n")
													logWriteAble.write(err+"\n")
													throw err;		
												}											
												console.log('wifi' + curCityId +'hp' + item.id + '热点信息保存成功');
												logWriteAble.write('hp' + item.id + '写结束\n')
												logWriteAble.write('hp' + item.id + '热点信息保存成功\n')
												innerCallback2(err);
											})
										}
									)
								}, 
								function(err) {
									var curPage = jsonData.page[0].currentPage;
									var wifiInfoWriteAble = fs.createWriteStream(options.currentWifiDir + '/' + pageIndex + '.json');
									wifiInfoWriteAble.write(body, function(err){
										if(err) {
											logWriteAble.write("err2\n")
											logWriteAble.write(err+"\n")
											throw err;

										}
										console.log('wifi'+ curCityId + '第' + pageIndex +'页热点信息保存成功');	
										logWriteAble.write('wifi'+ curCityId + '第' + pageIndex +'页热点信息保存成功\n')
										pageIndex++;
										innerCallback();		
									});
								}
							)
						});
				},
				function(err) {
					callback(null);
				}
			)
		}
	], function(err, result) {
		logWriteAble.write('抓取完成\n')
		if(err){
			console.log('fetch error ', err);
		}else{
			console.log('抓取完成，开始压缩打包...');
			logWriteAble.write('抓取完成，开始压缩打包\n')
			var compress = new targz().compress(options.currentWifiDir, options.currentAreaId + '.tar.gz', 
					function(err){
					    if(err) console.log(err);
					    console.log('压缩完成！');
					    fs.readFile('./downloaded.json', function(err, result){
					    	if(err){
					    		console.log('读取下载记录失败');
					    	}
					    	var downloaded = JSON.parse(result);
					    	downloaded.push(options.currentWifiDir.split('/').pop());
					    	logWriteAble.write('downloaded' + downloaded + '\n')
					    	fs.createWriteStream('./downloaded.json').write(JSON.stringify(downloaded));
					    	completeCallback();
					    })    
					}
				);
		}
	})
}

// 创建相关目录 
function mkdirSync(url,mode,cb){
    var arr = url.split("/");
    mode = mode || 0755;
    cb = cb || function(){};
    if(arr[0]==="."){//处理 ./aaa
        arr.shift();
    }
    if(arr[0] == ".."){//处理 ../ddd/d
        arr.splice(0,2,arr[0]+"/"+arr[1])
    }
    function inner(cur){
        if(!fs.existsSync(cur)){//不存在就创建一个
            fs.mkdirSync(cur, mode)
        }
        if(arr.length){
            inner(cur + "/"+arr.shift());
        }else{
            cb();
        }
    }
    arr.length && inner(arr.shift());
}


/**
 * robot start function
 **/
function fire(options){
	if(!options.areaId){
		return '没有城市id';	
	}else{
		if(!util.isArray(options.areaId)) options.areaId = [options.areaId];
		var downloaded = JSON.parse(fs.readFileSync('./downloaded.json'));
		async.filterSeries(options.areaId,
			function(item, callback){
				if(downloaded.indexOf(item) == -1){
					callback(true);
				}else{
					callback(false);
				}
			},
			function(result){
				defaultConfig.areaId = result;
				console.log('有', options.areaId.length - result.length, '已经抓取过，剩余', result.length, '个城市wifi热点需要抓取');
				options = defaultConfig;
			}
		)
	}

	console.log(options)
	async.eachSeries(options.areaId, 
		function(item, callback){
			var currentWifiDir = options.docDir + item;
			var currentHpDir = currentWifiDir + "/hp";
			console.log('正在创建目录...', currentWifiDir);
			mkdirSync(currentWifiDir);
			mkdirSync(currentHpDir);
			options.currentWifiDir = currentWifiDir;
			options.currentHpDir = currentHpDir;
			options.currentAreaId = item;
			robot(options, function(){
				callback(null);
			});
		}
	)
	
}

exports.fire = fire;



