import { db, storage } from '../../firebaseConfig'
import { collection, addDoc, getDocs, getDoc, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { IncomingForm } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

const getField = (fields, fieldName) => {
    const value = fields[fieldName];
    if (Array.isArray(value) && value.length > 0) {
        return value[0];
    }
    return value || null;
};

export default function handler(req, res) {
  return new Promise(async (resolve, reject) => {
    if (req.method === 'POST') {
      const form = new IncomingForm();

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          res.status(500).json({ success: false, error: 'Form parsing error' });
          return resolve();
        }

        try {
          const uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image;
          if (!uploadedFile) {
            res.status(400).json({ success: false, error: 'File not provided.' });
            return resolve();
          }

          const userData = JSON.parse(getField(fields, 'userData') || '{}');
          const scheduleId = getField(fields, 'scheduleId');
          
          if (!userData || !userData.id) {
              res.status(400).json({ success: false, error: 'User data not provided or invalid.' });
              return resolve();
          }

          if (!scheduleId) {
              res.status(400).json({ success: false, error: 'Schedule ID not provided.' });
              return resolve();
          }
          
          const fileContent = fs.readFileSync(uploadedFile.filepath);
          const uniqueFileName = `${Date.now()}_${uploadedFile.originalFilename}`;
          const storageRef = ref(storage, `gallery-images/${uniqueFileName}`);

          await uploadBytes(storageRef, fileContent);
          const downloadURL = await getDownloadURL(storageRef);

          const newImageData = {
            scheduleId,
            imageUrl: downloadURL,
            fileName: uniqueFileName,
            uploadedBy: {
              id: userData.id,
              name: userData.name,
              region: userData.region,
            },
            uploadedAt: new Date().toISOString(),
            type: 'free-schedule',
            emojis: {},
            comments: [],
            description: getField(fields, 'activity') || '',
            location: getField(fields, 'location') || '',
            date: getField(fields, 'date'),
          };

          const docRef = await addDoc(collection(db, "gallery"), newImageData);
          
          res.status(200).json({ success: true, message: 'Image uploaded successfully', data: { id: docRef.id, ...newImageData } });
          resolve();

        } catch (error) {
          console.error('Error processing file upload:', error);
          res.status(500).json({ success: false, error: 'Internal Server Error', details: error.message });
          resolve();
        }
      });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      resolve();
    }
  });
}
