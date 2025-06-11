// Add the required ExifTool tags:
var exifToolTagNamesDatabase = {
  // The format of this list is:
  // "Group0:TagName": "Column display name"

  // General
  "File:FileSize": "File Size",

  // PDF
  "PDF:ContainerVersion": "PDF Container Version",
  "PDF:Author": "PDF Author",
  "PDF:PageCount": "PDF Page Count",

  // MPEG
  "MPEG:AudioBitrate": "MPEG Audio Bitrate",
  "MPEG:SampleRate": "MPEG Sample Rate",

  // JFIF
  "JFIF:XResolution": "JFIF X Resolution",

  // PNG
  "PNG:BitDepth": "PNG Bit Depth",

  // QuickTime
  "QuickTime:Rotation": "QuickTime Rotation",
}
// -------------

var exifTool = new ActiveXObject("DOpusScriptingExtensions.ExifTool")

function OnInit(/* ScriptInitData */ data) {
  data.name = "ExifTool-columns-plugin"
  data.desc = "The plugin to add extra columns provided by ExifTool"
  data.default_enable = true
  data.config_desc = DOpus.NewMap()
  data.config_desc("debug") = "Print debug messages to the script log"
  data.config.debug = false
  data.config.extensionsWhiteList = ""
  data.config_desc("extensionsWhiteList") = "Comma separated list of file extensions (case insensitive) to process. Leave empty to process all files. Example of the list: '.jpeg,.pdf,.psd'"
  data.version = "0.0-dev"
  data.url = "https://github.com/PolarGoose/DirectoryOpus-ExifToolColumns-Plugin"

  for (var tagName in exifToolTagNamesDatabase) {
    var col = data.AddColumn()
    col.name = tagName
    col.method = "OnColumnDataRequested"
    col.autorefresh = true
    col.justify = "left"
    col.multicol = true
    col.label = exifToolTagNamesDatabase[tagName]
  }
}

function OnColumnDataRequested(/* ScriptColumnData */ data) {
  var filePath = data.item.realpath
  debug("OnColumnDataRequested: filePath=" + filePath)

  // Fill the columns with empty values to ensure that OnColumnDataRequested is called only once
  fillColumnsWithEmptyValues(data.columns)

  if (isUncOrFtpPath(filePath) || data.item.is_dir) {
    debug("Skip UNC, FTP or directory path")
    return
  }

  if (shouldIgnoreFileExtension(filePath))  {
    return
  }

  try {
    fillColumns(filePath, data.columns)
  } catch (e) {
    debug("Exception: " + e)
  }
}

function fillColumnsWithEmptyValues(/* Map */ columns) {
  for (var e = new Enumerator(columns); !e.atEnd(); e.moveNext()) {
    columns(e.item()).value = ""
  }
}

function fillColumns(/* Path */ filePath, /* Map */ columns) {
  var tags = JSON.parse(exifTool.GetInfoAsJson(filePath, getKeys(exifToolTagNamesDatabase)))[0]

  for (var tagFullName in tags) {
    if (tagFullName === "SourceFile") {
      continue
    }

    var tagValue = tags[tagFullName].val
    var tagName = getGroup0AndTagName(tagFullName)
    columns(tagName).value = tagValue
  }
}

// Extract the tag group0 and tag name:
//   QuickTime:Meta:TagName => QuickTime:TagName
function /* string */ getGroup0AndTagName(/* string */ tagFullName) {
  var parts = tagFullName.split(":")
  return parts[0] + ":" + parts[2]
}

function /* bool */ shouldIgnoreFileExtension(/* Path */ filePath) {
  if (Script.config.extensionsWhiteList === "") {
    // No white list is provided, we don't need to ignore any extensions
    return false
  }

  if(filePath.ext === "") {
    debug("Skip file without extension: " + filePath)
    return true
  }

  if(!containsCaseInsensitive(Script.config.extensionsWhiteList, filePath.ext)) {
    debug("Skip extension: " + filePath.ext + " in file: " + filePath)
    return true
  }

  return false
}

function /* bool */ isUncOrFtpPath(/* Path */ filePath) {
  var fileFullName = String(filePath)
  return fileFullName.substr(0, 2) === "\\\\" || fileFullName.substr(0, 3) === "ftp"
}

function /* bool */ containsCaseInsensitive(/* string */ str, /* string */ substr) {
  str = str.toLowerCase()
  substr = substr.toLowerCase()
  return str.indexOf(substr) !== -1
}

function /* object[] */ getKeys(dictionary) {
  var keys = []
  for (var key in dictionary) {
    keys.push(key)
  }
  return keys
}

function /* void */ debug(text) {
  if (Script.config.debug) {
    DOpus.Output(text)
  }
}
