const fs = require('fs');
let content = fs.readFileSync('src/pages/Clients/ClientDetail.jsx', 'utf8');

const doubleStateStr = `  const [photoFile, setPhotoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)`;

const singleStateStr = `  const [photoFile, setPhotoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)`;

content = content.replace(doubleStateStr, singleStateStr);
fs.writeFileSync('src/pages/Clients/ClientDetail.jsx', content);
