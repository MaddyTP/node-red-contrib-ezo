# node-red-contrib-ezo

This Node-Red is designed to communicate with Atlas Scientific Ezo modules over I2C.  Current version only supports ezo modules in I2C mode and newer Raspberry Pi's on bus 1 - /dev/i2c-1.

## Install

Either use the Manage Palette option in the Node-RED Editor menu, or run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install --unsafe-perm node-red-contrib-ezo

## Usage

Designed to accept all standard commands from the Atlas Scientific documentation.

### Input

All commands can be sent as a single string in `msg.payload`, those which have a command and input value separated by a comma can be broken into `msg.command` and `msg.payload` properties. Commands can differ from one Ezo module to another, please refer to Atlas Scientific's website for documentation.  Below are a few examples of commands structured in an acceptable manner.

```javascript
msg = { payload: 'L,0' };  // turns led off

msg = { command: 'L', payload: 1 };  // turns led on

msg = { command: 'L', payload: false };  // turns led off

msg = { command: 'L', payload: '1' };  // turns led on

msg = { payload: 'Status' };  // returns status

msg = { command: 'R'};  // reads probe
```

### Ouptut

Some commands such as 'Sleep', 'Factory', and 'I2C,n' do not provide a response so will not generate an output message.  Most commands will generate a response containing the original command and a value, however some Ezo modules can generate multiple values in which the `msg.payload` will contain an array.  If the output value can be parsed to a number it will be, otherwise it will be a string.  Since v1.1.1 extra properties in input pass through to output. 

```javascript
msg = {
    topic: String,
    command: String,
    payload: String / Number / Array,
}
```

Examples of commands and responses:

**Ezo Board:**  Temperature  
**Command:**  Status  
**Raw Response:**  1?STATUS,P,3.28  
  
**Node Output:**
```javascript
msg = {
    topic: 'tempurature',
    command: 'STATUS',
    payload: [
        'P',
        '3.28',
    ],
};
```
  
**--- OR ---**  
  
**Ezo Board:**  pH  
**Command:**  R   
**Raw Response:**  19.831
  
**Node Output:**
```javascript
msg = {
    topic: 'ph',
    command: 'R',
    payload: 9.831,
};
```

### Errors

Since v1.1.0 errors are catchable by the CATCH node.  If an error occurs, a message will not be sent.  Common errors include the following:

**'Invalid payload!'** - Error: Command must be under 32 characters.  
**'Syntax Error!'** - Error: Ezo board did not recognize the command.  
**'No data to send.'** - Warning: Command sent to the Ezo board was empty.  

## Important Note

This node uses the I2C-bus package from @fivdi. You can find his work on github: https://github.com/fivdi/i2c-bus  