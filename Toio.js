class Toio {

    constructor(peripheral) {
        this.serviceID = "10B20100-5B3B-4571-9508-CF3EFCD7BBAE";
        this.characteristicIDMotor = "10B20102-5B3B-4571-9508-CF3EFCD7BBAE";
        this.characteristicIDPos = "10B20101-5B3B-4571-9508-CF3EFCD7BBAE";
        this.characteristicIDMotion = "10B20106-5B3B-4571-9508-CF3EFCD7BBAE";
        this.characteristicIDButton = "10B20107-5B3B-4571-9508-CF3EFCD7BBAE";
        this.characteristicIDBattery = "10B20108-5B3B-4571-9508-CF3EFCD7BBAE"

        this.peripheral = peripheral;

        this.peripheralUUID = peripheral.uuid;
    }

    wired(obniz){}

    isDevice(peripheral){
        if (peripheral.localName == "toio Core Cube"){
            return true;
        }else{
            return false;
        }
    }

    async connectWait(timeout=100){
        this.timeout = timeout;

        if(this.peripheral) {
            console.log("found");

            if (this.isDevice(this.peripheral)) {
                console.log("It's toio!");
            } else {
                console.log("It's not toio!");
                return 1;
            }

            this.peripheral.onerror = function(err){
                console.log("error : " + err.message);
            }

            let i = 0;
            for(i=0; i<5; i++)
            {
                try {
                    await this.peripheral.connectWait();
                    console.log("connected");
                    return 0;

                } catch (e) {
                    console.error(e);

                    const sleep = function(ms) {
                        return new Promise(resolve => setTimeout(resolve, ms));
                    };
                    const wait = async function(ms){
                        await sleep(ms);
                    }

                    await wait(this.timeout);
                }
            }
        }

        return -1
    }

    async disconnectWait(){
        await this.peripheral.disconnect();
    }

    async getPosition(){
        let readData = await this.peripheral.getService(this.serviceID).getCharacteristic(this.characteristicIDPos).readWait();
        let obj = new Object();

        //NOTE: toioの中心から見たポジション
        obj.posX = readData[2]<<8|readData[1];
        obj.posY = readData[4]<<8|readData[3];
        obj.angle = readData[6]<<8|readData[5];
        obj.posSensorX = readData[8]<<8|readData[7];
        obj.posSensorY = readData[10]<<8|readData[9];
        obj.posSensorAngle = readData[12]<<8|readData[11];

        return obj;
    }

    async getMotion(){
        let readData = await this.peripheral.getService(this.serviceID).getCharacteristic(this.characteristicIDMotion).readWait();
        let obj = new Object();

        //NOTE: toioの中心から見たポジション
        obj.isHorizon = readData[1];
        obj.isCollision = readData[2];
        obj.isDoubletap = readData[3];
        obj.atitude = readData[4];

        return obj;
    }

    async getButtonState(){
        let readData = await this.peripheral.getService(this.serviceID).getCharacteristic(this.characteristicIDButton).readWait();
        if(readData[1]==0x80){
            return true;
        }else{
            return false;
        }
    }

    async getBatteryState(){
        let readData = await this.peripheral.getService(this.serviceID).getCharacteristic(this.characteristicIDBattery).readWait();
        return readData[0];
    }

    async moveAround(leftWheelPower=0, rightWheelPower=0){
        let constraintWheelPower = function(wheelPower){
            // NOTE: Power is limited belong 0 to 255. And minus value is backward.
            if (wheelPower < -255){
                wheelPower = -255;
            }else if(wheelPower > 255){
                wheelPower = 255;

            }
            return wheelPower;
        }

        let numWheelDirection = function(wheelPower){
            // NOTE: 1 is forward. and 2 is backward.
            if(wheelPower >= 0){
                return 1;
            }else if(wheelPower < 0){
                return 2;
            }
        }

        leftWheelPower = constraintWheelPower(leftWheelPower);
        rightWheelPower = constraintWheelPower(rightWheelPower);
        var leftWheelDirection = numWheelDirection(leftWheelPower);
        var rightWheelDirection = numWheelDirection(rightWheelPower);

        await this.peripheral.getService(this.serviceID).getCharacteristic(this.characteristicIDMotor).
        writeWait([1,
            1,leftWheelDirection,Math.abs(leftWheelPower),
            2,rightWheelDirection,Math.abs(rightWheelPower)]);
    }


    async movePosition(timeoutSec=5,
                       moveType=0, maxWheelPower=30, wheelPowerType=30,
                       targetPosX=0, targetPosY=0, targetAngle=0){

        let parceNumber = function(pos){
            //NOTE: Pos is must hove belong 0 to 65535.
            if(pos > 65535){
                pos = 65535;
            }else if(pos < 0){
                pos = 0;
            }

            let buffer = new ArrayBuffer(2);
            let dv = new DataView(buffer);
            dv.setUint16(0,pos);

            let obj = new Object();
            obj.value1 = dv.getUint8(0);
            obj.value2 = dv.getUint8(1);
            console.log(obj.value1.toString(16)+obj.value2.toString(16));
            return obj;
        }

        let posXObj = parceNumber(targetPosX);
        let posYObj = parceNumber(targetPosY);
        let targetAngleObj = parceNumber(targetAngle);

        await this.peripheral.getService(this.serviceID).getCharacteristic(this.characteristicIDMotor).
        writeWait([0x03,0x00,
            timeoutSec,moveType,maxWheelPower,
            wheelPowerType,0x00,
            posXObj.value2, posXObj.value1,
            posYObj.value2, posYObj.value1,
            targetAngleObj.value2, targetAngleObj.value1]);
    }
}