module.exports = function(RED) {
    var I2C = require("i2c-bus");

    function Ezo(config) {
        RED.nodes.createNode(this, config);
        this.tempComp = config.tempComp;

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

        node.processResponse = (res) => {
            var converted = { status: { code: 0, message: ''}, command: '', value: ''};
            converted.status.code = res[0];
            switch(converted.status.code) {
                case 1:
                    converted.status.message = 'success';
                    break;
                case 2:
                    converted.status.message = 'syntax error';
                    break;
                case 254:
                    converted.status.message = 'still processing - not ready';
                    break;
                case 255:
                    converted.status.message = 'no data to send';
                    break;
            }
            var resString = res.toString('utf8', 1);
            if (resString === '') {
                converted.value = '';
            } else {
                if (resString.indexOf(',') !== -1) {
                    var splt = resString.split(',');
                    if (splt[0].indexOf('?') !== -1) {
                        converted.command = splt[0].replace('?', '');
                    }
                    if (splt.length !== 2) {
                        converted.value = [];
                        var i;
                        for (i = 1; i < splt.length; i++) {
                            converted.value.push(splt[i]);
                        }
                    } else {
                        converted.value = Number.isNaN(splt[1]) ? splt[1] : parseFloat(splt[1]);
                    }
                } else {
                    converted.value = Number.isNaN(resString) ? resString : parseFloat(resString);
                }
            }
            return converted;
        };

        node.on("input", function(msg) {
            if (!isRunning) {
                var port = I2C.openSync(1);
                try {
                    isRunning = true;
                    var pload = msg.payload;
                    if (typeof pload !== "string" || pload.length > 32) {
                        throw new Error('Invalid payload!');
                    }
                    var buf = Buffer.from(pload);
                    port.i2cWrite(node.address, buf.length, buf, function(err) {
                        if (err) throw err;
                        const strTest = new RegExp(noRead.join('|')).test(pload.toLowerCase());
                        if (!strTest) {
                            var rBuf = Buffer.alloc(32);
                            const loop = setInterval(() => {
                                port.i2cRead(node.address, rBuf.length, rBuf, function(err, size, res) {
                                    if (err) throw err;
                                    if (res[0] !== 254) {
                                        clearInterval(loop);
                                        var newRes = node.processResponse(res);
                                        if (newRes.command === '') {
                                            newRes.command = (pload.indexOf(',') === -1) ? pload : pload.split(',')[0];
                                        }
                                        newMsg = {};
                                        newMsg.status = newRes.status;
                                        newMsg.command = newRes.command;
                                        newMsg.payload = newRes.value;
                                        node.send(newMsg);
                                    }
                                });
                            }, 300);
                        }
                    });
                } catch(e) {
                    node.error(e, msg);
                } finally {
                    port.closeSync();
                    isRunning = false;
                }
            }
        });
    }
    RED.nodes.registerType("ezo", Ezo);
}