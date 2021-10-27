module.exports = function(RED) {
    var I2C = require("i2c-bus");

    function Ezo(config) {
        RED.nodes.createNode(this, config);
        this.ezoTopic = config.ezoTopic;
        if (config.customAddr) {
            this.address = parseInt(config.address);
        } else {
            switch(config.ezoBoard) {
                case 'ph':
                    this.address = 99;
                    break;
                case 'ec':
                    this.address = 100;
                    break;
                case 'orp':
                    this.address = 98;
                    break;
                case 'do':
                    this.address = 97;
                    break;
                case 'rtd':
                    this.address = 102;
                    break;
                case 'co2':
                    this.address = 105;
                    break;
                case 'o2':
                    this.address = 108;
                    break;
                case 'hum':
                    this.address = 111;
                    break;
                case 'prs':
                    this.address = 106;
                    break;
                case 'pmp':
                    this.address = 103;
                    break;
                case 'pmp-l':
                    this.address = 109;
                    break;
                case 'rgb':
                    this.address = 112;
                    break;
                case 'flo':
                    this.address = 104;
                    break;
            }
        }
        var node = this;
        var isRunning = false;
        var noRead = ['sleep', 'factory', 'i2c'];
        node.errorHandler = (port, err, msg) => {
            port.closeSync();
            node.error(err, msg);
            isRunning = false;
            return;
        }
        node.processRequest = (req) => {
            var newStr = '';
            var c = '';
            var p = '';
            if (req.hasOwnProperty('command')) { c = req.command.toString(); }
            if (req.hasOwnProperty('payload')) {
                p = req.payload.toString();
                if (p === 'true') p = '1';
                if (p === 'false') p = '0';
            }
            if (c !== '' && p !== '') {
                newStr = `${c},${p}`;
            } else if (c !== '') {
                newStr = c;
            } else if (p !== '') {             
                newStr = p;
            }
            return newStr;
        }
        node.processResponse = (res) => {
            var converted = { command: '', value: ''};
            var resString = res.toString('utf8', 1).replace(/\0/g, '');
            if (resString !== '') {
                if (resString.indexOf(',') !== -1) {
                    var splt = resString.split(',');
                    var stp = 0;
                    if (splt[0].indexOf('?') !== -1) {
                        converted.command = splt[0].replace('?', '');
                        stp = 1;
                    }
                    converted.value = [];
                    for (var i = stp; i < splt.length; i++) {
                        if (splt[i] === '') { 
                            converted.value.push( '' );
                        } else {
                            converted.value.push( isNaN(splt[i]) ? splt[i] : parseFloat(splt[i]) );
                        };
                    }
                } else {
                    converted.value = isNaN(resString) ? resString : parseFloat(resString);
                }
            } else {
                converted.command = '';
                converted.value = '';
            }
            return converted;
        };
        node.on("input", function(msg) {
            var pload = node.processRequest(msg);
            var addr = msg.address || node.address;
            if (pload.length > 32) {
                node.error('Invalid payload!');
                return;
            }
            var buf = Buffer.from(pload);
            var port = I2C.openSync(1);
            port.i2cWrite(addr, buf.length, buf, function(err) {
                if (err) {
                    node.errorHandler(port, err, msg);
                    return;
                };
                const strTest = new RegExp(noRead.join('|')).test(pload.toLowerCase());
                if (!strTest && !isRunning) {
                    isRunning = true;
                    var rBuf = Buffer.alloc(32);
                    const loop = setInterval(() => {
                        port.i2cRead(addr, rBuf.length, rBuf, function(err, size, res) {
                            if (err) {
                                node.errorHandler(port, err, msg);
                                return;
                            };
                            if (res[0] !== 254) {
                                clearInterval(loop);
                                if (res[0] === 2) {
                                    node.errorHandler(port, 'Syntax error!', msg);
                                    return;
                                }
                                port.closeSync();
                                if (res[0] === 255) {
                                    node.warn('No data to send.');
                                    isRunning = false;
                                    return;
                                }
                                var newRes = node.processResponse(res);
                                if (newRes.command === '') { newRes.command = (pload.indexOf(',') === -1) ? pload : pload.split(',')[0]; }
                                if (!msg.hasOwnProperty('topic') && node.ezoTopic !== undefined) { msg.topic = node.ezoTopic; }
                                msg.command = newRes.command;
                                msg.payload = newRes.value;
                                node.send(msg);
                                isRunning = false;
                            }
                        });
                    }, 300);
                }
            });
        });
    }
    RED.nodes.registerType("ezo", Ezo);
}