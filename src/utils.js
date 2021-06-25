
import {
    FILE_STL,
    FILE_COLLADA,
    FILE_OBJ,
    FILE_CDF,
    FILE_VTK
} from './constants.js';

function getFileType(fn) {

    if (fn.length <= 4) {
        console.warn(`invalid mesh filename: ${fn}`);
        return false;
    }

    let ext = fn.split('.').pop().toLowerCase();

    let out_type;

    if (ext == 'dae') {
        out_type = FILE_COLLADA;
    }
    else if (ext == 'stl') {
        out_type = FILE_STL;
    }
    else if (ext == 'obj') {
        out_type = FILE_OBJ;
    }
    else if (ext == 'cdf') {
        out_type = FILE_CDF;
    }
    else if (ext == 'vtk') {
        out_type = FILE_VTK;
    }
    else {
        console.warn(`invalid mesh filename extension .${ext}`);
        return false;
    }


    return out_type;

}

function getPath(url) {
    let arr = url.split(/\//g);

    arr.splice(arr.length - 1, 1);

    let path = '';

    for (let i = 0; i < arr.length; i++) {
        const str = arr[i] + '/';
        path += str;
    }

    return path;
}

function getFileName(file) {
    let arr = file.split(/\//g);
    return arr.splice(arr.length - 1, 1)[0].split('.')[0];
}

export let Utils = {
    getFileType,
    getPath,
    getFileName
}