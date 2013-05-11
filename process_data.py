import sys
import dataset
import simplejson
from datetime import datetime, timedelta

# 2/05/2011 17:42'
DATE_FORMAT = '%d/%m/%Y %H:%M'
DATE_FORMAT_SQLITE = '%Y-%m-%d %H:%M'

START_DATE = datetime(2013, 3, 1, 8, 0)
END_DATE = datetime(2013, 3, 31, 20, 0)

def connect():
    db = dataset.connect('sqlite:///recorridos.db')
    return db


def load(csv_file):
    table = connect()['recorridos']
    for line in csv.DictReader(open(csv_file, 'rb')):
        line['DESTINOFECHA'] = datetime.strptime(line['DESTINOFECHA'], DATE_FORMAT)
        line['ORIGENFECHA'] = datetime.strptime(line['ORIGENFECHA'], DATE_FORMAT)
        for k in ['DESTINOESTACIONID', 'TIEMPOUSO', 'USUARIOID']: line[k] = int(line[k])
        table.insert(line)


def select(start_date, end_date, interval=timedelta(minutes=15)):
    db = connect()

    start = start_date
    end = start + interval

    while start < end_date:
        start_f = start.strftime(DATE_FORMAT_SQLITE)
        end_f   = end.strftime(DATE_FORMAT_SQLITE)

        query = """
        SELECT COUNT() as c, ORIGENESTACIONID as s, DESTINOESTACIONID as t
        FROM recorridos 
        WHERE 
        TIEMPOUSO < 120
        AND
        ((ORIGENFECHA <= Datetime('%s') AND DESTINOFECHA >= Datetime('%s') AND DESTINOFECHA <= Datetime('%s')) -- from, from, to
        OR 
        (ORIGENFECHA >= Datetime('%s') AND DESTINOFECHA <= Datetime('%s')) -- from, to
        OR 
        (ORIGENFECHA <= Datetime('%s') AND DESTINOFECHA >= Datetime('%s'))) -- to, to
        GROUP BY ORIGENESTACIONID, DESTINOESTACIONID;
        """ % (start_f, start_f, end_f, start_f, end_f, end_f, end_f)

        print >>sys.stderr, "interval: %s" % start.strftime(DATE_FORMAT_SQLITE)
        print simplejson.dumps([start.strftime("%s")] + [(int(row['s']), row['t'], row['c']) for row in db.query(query)])

        if end.hour == 20 and end.minute > 0:
            # paso al dia siguiente
            next_day = start + timedelta(days=1)
            start = datetime(next_day.year, next_day.month, next_day.day, START_DATE.hour, START_DATE.minute)
        else:
            start = end
        end = start + interval

select(START_DATE, END_DATE)



