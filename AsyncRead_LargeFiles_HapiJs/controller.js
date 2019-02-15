

const Papa = require('papaparse');
const fs = require('fs');
const Joi = require('joi');
const moment = require('moment');

const HeadersObj = require('./headers');
const DataTrim = require('./columnsTrim');
const CSVConfig = require('./schemaObject');
const path = require('path');

Array.prototype.diff = function (a) {
  return this.filter(function (i) {
    return a.indexOf(i) === -1;
  });
};

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

export default function (server, client) {

  server.route({
    method: 'POST',
    path: '/api/',
    config: {
      handler: async (req, res) => {

        //checking the filetype and abort if it is not an csv
        const filename = req.payload.file.hapi.filename;
        const extension = path.extname(filename);
        let fileSizeInBuffer = (req.payload.file._data).toString('utf8');
        if (extension !== '.csv') {
          return res({ csvContent: 'Please upload csv file', Errfilename: '' });
        }
        if(fileSizeInBuffer === '') {
          return res ({ csvContent: 'File cannot be empty', Errfilename: '' });
        }

        const errors = [];
        const duplicates = [];
        const nonExistRecords = [];
        let rowCount = 0;
        const fileData = [];
        let action = '';

        const promise =  new Promise((resolve, reject) => {
          Papa.parse(req.payload.file, {
            header: true,
            skipEmptyLines: true,
            step: async function (row, parser) {
              parser.pause();
              rowCount++;         //get the line number

              let first_row_data = row.data[0];

              const fileHeaders = Object.keys(first_row_data);
              const skinHeadersObjKeys = Object.keys(skinHeadersObj);

              const nonExistKeys = skinHeadersObjKeys.diff(fileHeaders);
              const inValidHeaders = [];

              Object.keys(first_row_data).map((key) => {
                if (!(key in skinHeadersObj)) {
                  inValidHeaders.push(key);
                }
              });


              if (inValidHeaders.length === 0 && nonExistKeys.length === 0) {
                try {
                  const csvData = Joi.validate(row.data[0], skinCSVConfig, {
                    abortEarly: false,
                  });

                  let rowErrors = [];
                  const errDetails = csvData.error ? csvData.error.details : [];
                  if (errDetails.length !== 0) {
                    for (let i = 0; i < errDetails.length; i++) {
                      const errValues = errDetails[i];
                      let eventlist = JSON.stringify(errValues.message);//Jsonresult
                      let eventstring = new String();
                      eventstring = eventlist.toString().replace(/\\"/g, '');

                      rowErrors.push(eventstring);
                      errors.push(eventstring + ' at ' + rowCount + ' row');
                    }
                  }

                  //adding extra column(errors) to the csv file
                  first_row_data.errors = rowErrors.join(' || ');
                  const validData = csvData.value;
                   
              } else {
                if (nonExistKeys.length !== 0) {
                  if (nonExistKeys.length === 1) {
                    // resolve(nonExistKeys + ' header is missing')
                    resolve({ headersErr: nonExistKeys + ' header is missing' });
                  } else {
                    // resolve(nonExistKeys + ' headers are missing')
                    resolve({ headersErr: nonExistKeys + ' headers are missing' });
                  }
                } else {
                  // resolve('Please Enter Valid:' + inValidHeaders + ' header/headers')
                  resolve({ headersErr: 'Please Enter Valid:' + inValidHeaders + ' header/headers' });

                }
              }
              parser.resume();
            },
            complete() {
              let completeErrorsList = [];
              if (errors.length !== 0) {
                completeErrorsList.push(errors);
              } if (duplicates.length !== 0) {
                completeErrorsList.push(duplicates);
              } if (nonExistRecords.length !== 0) {
                completeErrorsList.push(nonExistRecords);
              } if (completeErrorsList.length !== 0) {
                const schemaName = 'SKIN';
                const timestamp = moment().format('YYYYMMDDHHmmss');
                const Errfilename = action + 'failed' + '_' + schemaName + '_' + timestamp + '.csv';
                const csvPath = path.join(__dirname, '/../../../public/errorFiles/' + Errfilename);

                let csvContent = '';
                const header = Object.keys(fileData[0]).join(',');
                const values = fileData.map(o => Object.values(o).join(',')).join('\n');

                csvContent += header + '\n' + values;

                fs.writeFile(csvPath, csvContent, 'utf8');
                resolve({ csvContent, Errfilename });
              } else {
                resolve({ csvContent: 'Validated Successfully', Errfilename: '' });
              }
            },
            error(err) {
              reject(err);
            }
          });
        });
        res(promise);
      },
      payload: {
        output: 'stream',
        parse: true,
        allow: 'multipart/form-data',
        maxBytes: 10 * 1024 * 1024 //10 mb,
      }
    }
  });

}
