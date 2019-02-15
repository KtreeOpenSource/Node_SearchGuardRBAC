const Scheduler = require('./models/scheduler')
const Cron = require('./models/cron')
var parser = require('cron-parser');


async function createJobsforScheduler(request,response) {
    try{
        let schedulerId = request.id
        let cronTime = request.cronTime
        var d1 = new Date ();
        var d2 = new Date ( d1 );
        d2.setHours ( d1.getHours() + 2 )    //create jobs upto 2 hours 
        var options = {
            currentDate: d1,
            endDate: d2,
            iterator: true
        };
        try{
            // create cron for scheduled time
            let res = await Cron.create({
                        schedulerId,
                        status:0,
                        executionTime: cronTime
                })
            process.exit();
        }catch (err) {
            process.exit();
        }  
    }catch(err){
        process.exit();
    }
}

createJobsforScheduler();
