# corejs-mysql

## Launch

```
npm install
npm test
```

TODO: use dockers for db 5.7.x and 8.x

## Database: MySQL  8.x or 5.7.x

```
mysql -u root -p
# OR
sudo -i
mysql

# create requirements
CREATE DATABASE IF NOT EXISTS corejs_database;
CREATE USER IF NOT EXISTS 'corejs_admin'@'localhost' IDENTIFIED BY 'SSddffgghhjj!!11';
ALTER USER 'corejs_admin'@'localhost' IDENTIFIED WITH mysql_native_password BY 'SSddffgghhjj!!11';
GRANT ALL PRIVILEGES ON corejs_database.* TO 'corejs_admin'@'localhost';
FLUSH PRIVILEGES;
exit

# check
mysql -u corejs_admin -p
USE corejs_database;
exit
```