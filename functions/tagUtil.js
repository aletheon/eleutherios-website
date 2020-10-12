exports.getCollectionTitlesFromTags = function(tags) {
  return new Promise((resolve, reject) => {
    if (tags.length == 0)
      resolve();
    else if (tags.length == 1)
      resolve(combineOneTag(tags));
    else if (tags.length == 2)
      resolve(combineTwoTags(tags));
    else if (tags.length == 3)
      resolve(combineThreeTags(tags));
    else if (tags.length == 4)
      resolve(combineFourTags(tags));
    else if (tags.length == 5)
      resolve(combineFiveTags(tags));
    else
      reject('cannot supply more than 5 tags');
  });
}

function combineOneTag(tags) {
  return new Promise((resolve, reject) => {
    var combinedTags = [];

    // Extrapolate this pattern
    // A
    combinedTags.push(tags.slice().splice(0, 1).toString().replace(/,/gi,'')); // A
    resolve(combinedTags);
  });
}

function combineTwoTags(tags) {
  return new Promise((resolve, reject) => {
    var combinedTags = [];

    // Extrapolate this pattern
    // A, B
    // AB
    tags.sort();

    combinedTags.push(tags.slice().splice(0, 1).toString().replace(/,/gi,'')); // A
    combinedTags.push(tags.slice().splice(1, 1).toString().replace(/,/gi,'')); // B
    combinedTags.push(tags.slice().splice(0, 2).toString().replace(/,/gi,'')); // AB
    resolve(combinedTags);
  });
}

function combineThreeTags(tags) {
  return new Promise((resolve, reject) => {
    var combinedTags = [];

    // Extrapolate this pattern
    // A, B, C
    // AB, AC, BC
    // ABC
    tags.sort();

    combinedTags.push(tags.slice().splice(0, 1).toString().replace(/,/gi,'')); // A
    combinedTags.push(tags.slice().splice(1, 1).toString().replace(/,/gi,'')); // B
    combinedTags.push(tags.slice().splice(2, 1).toString().replace(/,/gi,'')); // C
    combinedTags.push(tags.slice().splice(0, 2).toString().replace(/,/gi,'')); // AB
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // AC
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // BC
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // ABC
    resolve(combinedTags);
  });
}

function combineFourTags(tags) {
  return new Promise((resolve, reject) => {
    var combinedTags = [];

    // Extrapolate this pattern
    // A, B, C, D
    // AB, AC, AD, BC, BD, CD
    // ABC, ABD, ACD, BCD
    // ABCD
    tags.sort();

    combinedTags.push(tags.slice().splice(0, 1).toString().replace(/,/gi,'')); // A
    combinedTags.push(tags.slice().splice(1, 1).toString().replace(/,/gi,'')); // B
    combinedTags.push(tags.slice().splice(2, 1).toString().replace(/,/gi,'')); // C
    combinedTags.push(tags.slice().splice(3, 1).toString().replace(/,/gi,'')); // D
    combinedTags.push(tags.slice().splice(0, 2).toString().replace(/,/gi,'')); // AB
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // AC
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // AD
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // BC
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // BD
    combinedTags.push(tags.slice().splice(2, 1).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // CD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // ABC
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // ABD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // ACD
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // BCD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // ABCD
    resolve(combinedTags);
  });
}

function combineFiveTags(tags) {
  return new Promise((resolve, reject) => {
    var combinedTags = [];

    // Extrapolate this pattern
    // A, B, C, D, E
    // AB, AC, AD, AE, BC, BD, BE, CD, CE, DE
    // ABC, ABD, ABE, ACD, ACE, ADE, BCD, BCE, BDE, CDE
    // ABCD, ABDE, ACDE, BCDE
    // ABCDE
    tags.sort();

    combinedTags.push(tags.slice().splice(0, 1).toString().replace(/,/gi,'')); // A
    combinedTags.push(tags.slice().splice(1, 1).toString().replace(/,/gi,'')); // B
    combinedTags.push(tags.slice().splice(2, 1).toString().replace(/,/gi,'')); // C
    combinedTags.push(tags.slice().splice(3, 1).toString().replace(/,/gi,'')); // D
    combinedTags.push(tags.slice().splice(4, 1).toString().replace(/,/gi,'')); // E
    combinedTags.push(tags.slice().splice(0, 2).toString().replace(/,/gi,'')); // AB
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // AC
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // AD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // AE
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // BC
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // BD
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // BE
    combinedTags.push(tags.slice().splice(2, 1).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // CD
    combinedTags.push(tags.slice().splice(2, 1).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // CE
    combinedTags.push(tags.slice().splice(3, 1).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // CE
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(2, 1)).toString().replace(/,/gi,'')); // ABC
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // ABD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // ABE
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // ACD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // ACE
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // ADE
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // BCD
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // BCE
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // BDE
    combinedTags.push(tags.slice().splice(2, 1).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // CDE
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).toString().replace(/,/gi,'')); // ABCD
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // ABDE
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // ACDE
    combinedTags.push(tags.slice().splice(1, 1).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // BCDE
    combinedTags.push(tags.slice().splice(0, 1).concat(tags.slice().splice(1, 1)).concat(tags.slice().splice(2, 1)).concat(tags.slice().splice(3, 1)).concat(tags.slice().splice(4, 1)).toString().replace(/,/gi,'')); // ABCDE
    resolve(combinedTags);
  });
}