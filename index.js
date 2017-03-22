/**
 * index.js -- основной скрипт запуска сервиса
 **/

const express = require('express');
const rotator = require('file-stream-rotator');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');

const conf = require('./config');
const login = require('./routers/login');
const acount = require('./routers/acount');

let app = express();
let logDir = __dirname + '/logs';

fs.existsSync(logDir) || fs.mkdirSync(logDir);
let logStream = rotator.getStream({
	date_format: 'YYYY-MM-DD',
	filename: logDir + '/access-%DATE%.log',
	frequency: 'daily',
	verbose: false
});

app.use(cors());
app.use(morgan('combined', {stream: logStream}));

app.use('/login', login);
app.use('/acount', acount);

let port = conf.server.listenPort || 10000;
app.listen(port, () => {
	console.log('Update service start at port ' + port);
});

module.exports = app;

/*
const tm = setInterval(() => {
    console.log('Time: 1');
}, 2000);


const cp1251 = require('windows-1251');

const fb = require('node-firebird');
const opt = {};
opt.host = '192.168.0.69';
opt.port = 3050;
opt.database = 'D:/test/mariupol.fdb';
opt.user = 'SYSDBA';
opt.password = 'masterkey';
opt.lowercase_keys = false;
opt.role = null;
opt.pageSize = 4096;

var q = `select first 1 a.peracc, a.eic, a.name, a.firstname, a.patronymic, i.name as "CITY_TYPE",
c.name as "CITY", st.name as "STR_TYPE", s.name as "STREET", a.buildnum, a.buildlitter,
a.apartmentnum, a.apartmentlitter, m.name as "RAYON", ct.name as "COUNTER", cnt.serial,
ch.square, ch.peoplecnt,
ad.profilenum as "GROUP", ad.comment as "GROUP_NAME", am.monthcoef1, am.monthcoef2,
am.monthcoef3, am.monthcoef4, am.monthcoef5, am.monthcoef6, am.monthcoef7, am.monthcoef8,
am.monthcoef9, am.monthcoef10, am.monthcoef11, am.monthcoef12
from abon a
left join street s on s.streetkey = a.streetr
left join microrajon m on m.microrajonkey = a.microrajonsr
left join counter cnt on cnt.ownerkodr = a.kod
left join (
    select ap.datic, ap.kodr, ap.abonprofiledirr
    from abonprofiles ap
    where ap.datic = (select first 1 max(datic) from abonprofiles where kodr=ap.kodr and isbadv = 0)
) ap on a.kod = ap.kodr
join (
    select ch.kodr, ch.square, ch.peoplecnt
    from change ch
    where ch.datic = (select first 1 max(datic) from change where kodr = ch.kodr)
) ch on ch.kodr = a.kod
left join abonprofiledir ad on ad.abonprofiledirkey = ap.abonprofiledirr
left join abonprofilemonthcoef am on am.abonprofiledirr = ad.abonprofiledirkey
left join countertype ct on ct.countertypekey = cnt.countertyper
left join streettype st on st.streettypekey = s.streettyper
left join city c on c.citykey = s.cityr
left join inhabitedlocalitytype i on i.inhabitedlocalitytypekey = c.inhabitedlocalitytyper`;

var qe = `
    select a.peracc, et.name as "EQ_TYPE", ek.name as "EQ_NAME"
    from change c
    join equipment e on c.changekey = e.changer
    join eqtype et on e.eqtyper = et.eqtypekey
    join eqkind ek on e.eqkindr = ek.eqkindkey
    join abon a on a.kod = c.kodr
    where c.datic = (select first 1 max(datic) from change where kodr = c.kodr) and a.peracc = ?
`;

global.abonents = [];

fb.attach(opt, (err, db) => {
    if (err) {
        console.error(err);
        throw err;
    }

    db.query(q, (err, res) => {
        if (err) {
            console.log(err);
            throw err;
        }

        let abs = res.map(val => {
            let addr = [
                cp1251.decode(val.CITY_TYPE.toString('binary')).trim(),
                cp1251.decode(val.CITY.toString('binary')).trim() + ',',
                cp1251.decode(val.RAYON.toString('binary')).trim(),
                'р-н,',
                cp1251.decode(val.STR_TYPE.toString('binary')).trim(),
                cp1251.decode(val.STREET.toString('binary')).trim() + ',',
                'д.',
                val.BUILDNUM
            ].join(' ');
            if (val.BUILDLITTER) {
                addr += cp1251.decode(val.BUILDLITTER.toString('binary')).trim();
            }
            if (val.APARTMENTNUM) {
                addr += `кв. ${val.APARTMENTNUM}`;
            }

            return {
                ls: parseInt(val.PERACC.toString().trim()),
                eic: val.EIC.toString().trim(),
                family: cp1251.decode(val.NAME.toString('binary')).trim(),
                name: val.FIRSTNAME !== null ? cp1251.decode(val.FIRSTNAME.toString('binary')).trim() : '',
                patronymic: val.PATRONYMIC !== null ? cp1251.decode(val.PATRONYMIC.toString('binary')).trim() : '',
                address: addr,
                meter: val.COUNTER !== null ? cp1251.decode(val.COUNTER.toString('binary')).trim() : null,
                meter_numb: val.SERIAL !== null ? cp1251.decode(val.SERIAL.toString('binary')).trim() : null,
                group: val.GROUP,
                group_name: val.GROUP_NAME !== null ? cp1251.decode(val.GROUP_NAME.toString('binary')).trim() : null,
                heated_area: val.SQUARE,
                registered_persons: val.PEOPLECNT,
                pw_1: val.MONTHCOEF1,
                pw_2: val.MONTHCOEF2,
                pw_3: val.MONTHCOEF3,
                pw_4: val.MONTHCOEF4,
                pw_5: val.MONTHCOEF5,
                pw_6: val.MONTHCOEF6,
                pw_7: val.MONTHCOEF7,
                pw_8: val.MONTHCOEF8,
                pw_9: val.MONTHCOEF9,
                pw_10: val.MONTHCOEF10,
                pw_11: val.MONTHCOEF11,
                pw_12: val.MONTHCOEF12
            };

            //console.log(val.PERACC.toString());

             db.query(qe, [val.PERACC.toString()], (err, res) => {

             if (err) {
             console.error(JSON.stringify(err));
             thval err;
             }

             var eq = [];
             res.forEach(val => {
             eq.push(`${cp1251.decode(val.EQ_TYPE.toString('binary')).trim()} (${cp1251.decode(val.EQ_NAME.toString('binary')).trim()})`);
             console.log(eq);
             });
             ab.equipments = eq.join('; ');

             console.log(`RESULT: ${res}`);

             });


            global.abonents = abns;
            console.log(global);
        });
        //abonents = abns
    });
    db.detach();
});
console.log(global.abonents);
*/




