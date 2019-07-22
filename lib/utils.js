function uuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}

function arraySlice(array, subGroupLength) {
  let index = 0;
  let newArray = [];

  while(index < array.length) {
      newArray.push(array.slice(index, index += subGroupLength));
  }

  return newArray;
}

module.exports = {
  uuid,
  arraySlice,
}