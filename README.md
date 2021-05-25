# node-red-contrib-ezo

This Node-Red is designed to communicate with Atlas Scientific Ezo modules over I2C.  Current version only supports ezo modules in I2C mode and newer Raspberry Pi's on bus 1 - /dev/i2c-1.

## Install

Either use the Manage Palette option in the Node-RED Editor menu, or run the following command in your Node-RED user directory - typically `~/.node-red`

    npm install --unsafe-perm node-red-contrib-ezo

## Usage

Designed to accept payload formatted as string following the standard commands from the Atlas Scientific documentation.  Outputs responses in following properties:

```javascript
msg = {
    status: {
        code: Number,
        message: String,
    },
    command: String,
    payload: String / Number / Array,
}
```

### Example of a command and response:
  
**Command:**  'Status'  
**Response:**  1'?STATUS,P,3.28'
  
  **Output:**
```javascript
msg = {
    status: {
        code: 1,
        message: 'success',
    },
    command: 'STATUS',
    payload: [
        'P',
        '3.28',
    ],
};
```
  
**--- OR ---**  
  
**Command:**  'R'  
**Response:**  1'9.831'
  
  **Output:**
```javascript
msg = {
    status: {
        code: 1,
        message: 'success',
    },
    command: 'R',
    payload: 9.831,
};
```

### Important Note

This node is using the I2C-bus package from @fivdi. You can find his work on github: https://github.com/fivdi/i2c-bus  
This node is designed to work with Atlas Scientific Ezo modules: https://atlas-scientific.com/