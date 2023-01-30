'use strict';

const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js')

const ROOT_PATH = path.join(__dirname, '../lib/js');
function readFileList(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach(file => {
        const childPath = path.join(currentPath, file);
        const stat = fs.statSync(childPath);
        if (stat.isDirectory()) {
            readFileList(childPath);
        } else {
            if (file.endsWith('.js')) {
                fs.writeFileSync(childPath, UglifyJS.minify({
                    "file.js": fs.readFileSync(childPath, "utf8"),
                }).code, "utf8", function (error) {
                    console.log(error)
                });
            }

        }
    })
}

readFileList(ROOT_PATH);