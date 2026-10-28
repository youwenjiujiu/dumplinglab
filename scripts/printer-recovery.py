"""One-time recovery cutoff: never replay orders missing from an old backup."""
import fcntl, json, os, sqlite3, time
from pathlib import Path


def prepare(folder, now=time.time):
    config=json.loads((folder/'live-config.json').read_text())
    ledger=Path(config['ledger'])
    if not ledger.is_absolute():ledger=folder/ledger
    if not ledger.is_file():raise ValueError('恢复数据库不存在，请重新完整解压恢复包。')
    with open(str(ledger)+'.lock','a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        db=sqlite3.connect(ledger)
        try:
            with db:
                if not db.execute("SELECT value FROM meta WHERE key='recovery-cutoff-v1'").fetchone():
                    cutoff=str(now())
                    db.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('since',?)",(cutoff,))
                    db.execute("INSERT INTO meta(key,value) VALUES('recovery-cutoff-v1',?)",(cutoff,))
                    db.execute("UPDATE jobs SET status='uncertain',error='Restored backup: verify paper manually; no automatic replay' WHERE status IN ('sending','queued')")
        finally:db.close()


if __name__=='__main__':
    folder=Path(__file__).resolve().parent
    try:
        prepare(folder)
        print('恢复保护已开启：首次恢复启动前的订单不自动重打。请人工核对停机期间漏单。',flush=True)
        os.execv('/bin/bash',['bash',str(folder/'运行出单.sh')])
    except (OSError,ValueError,sqlite3.Error) as e:
        print('恢复未启动：'+str(e),flush=True)
        raise SystemExit(1)
