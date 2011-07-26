if (!Date.now)
Date.now = function now() { return (new Date).getTime(); };

if (!Date.prototype.getTimezoneOffset)
Date.prototype.getTimezoneOffset = function getTimezoneOffset() {
  if (this._timezoneOffsetStd === undefined) {
    var date1 = new Date(this.getFullYear(), this.getMonth(), this.getDate(),
                         0,0,0,0),
        temp = date1.toGMTString(),
        date2 = new Date(temp.substring(0, temp.lastIndexOf(" ")-1));
    this._timezoneOffsetStd = (date2 - date1) / 60000;
  }
  return this._timezoneOffsetStd;
};
