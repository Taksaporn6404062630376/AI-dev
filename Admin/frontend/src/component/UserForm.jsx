import React, { useState, useRef, useEffect } from 'react'
import { Grid } from '@material-ui/core';
import Controls from './controls/Controls';
import { useForm, Form } from './UseForm';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import axios from 'axios';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import {canvasPreview} from './controls/canvasPreview'
import 'react-image-crop/dist/ReactCrop.css'

const roleItem = [
  { id: 'student', title: 'Student' },
  { id: 'teacher', title: 'Teacher' },
];

const initialFValues = {
  fullName: '',
  role: 'student',
};

function centerAspectCrop(
  mediaWidth,
  mediaHeight,
  aspect,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export default function UseForm(props) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imgSrc, setImgSrc] = useState('')
  const previewCanvasRef = useRef(null)
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [aspect, setAspect] = useState(10 / 10)

  const validate = (fieldValues = values) => {
    let temp = { ...errors };
    if ('fullName' in fieldValues) {
    const isValidFullname = /^[a-zA-Z\s]*$/.test(fieldValues.fullName);

    // Check if the field is empty or contains only English letters
    temp.fullName = fieldValues.fullName
      ? isValidFullname
        ? ''
        : 'Please enter only English letters'
      : 'This field is required.';
  }
      
      setErrors({
      ...temp,
    });

    if (fieldValues == values)
      return Object.values(temp).every((x) => x == '');
  };

  const {
    values,
    errors,
    setErrors, // Ensure setErrors is available
    handleInputChange,
    resetForm,
  } = useForm(initialFValues, true, validate);


  function onSelectFile(e) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined)
      const reader = new FileReader()
      reader.addEventListener('load', () =>
        setImgSrc(reader.result ? reader.result.toString() : ''),
      )
      reader.readAsDataURL(e.target.files[0])
    }
  }

  function onImageLoad(e) {
    if (aspect) {
      const { width, height } = e.currentTarget
      setCrop(centerAspectCrop(width, height, aspect))
    }
  }

  async function handleSubmit (e) {
    e.preventDefault();
    
    try {
      const image = imgRef.current;
      const previewCanvas = previewCanvasRef.current;
      if (!image || !previewCanvas || !completedCrop) {
        throw new Error('Crop canvas does not exist');
      }
  
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
  
      const canvas = document.createElement('canvas');
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }
  
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );
  
      const base64Image = canvas.toDataURL('image/jpeg');
  
      await axios.post('http://localhost:8081/AddUser', {
        CSName: values.fullName,
        role: values.role,
        imgpath: base64Image,
      });
  
      window.location.reload();
  
      resetForm();
      clearFile();
    } catch (error) {
      console.error('Error creating:', error);
    }
  }
  
  

  useEffect(() => {
    if (
      completedCrop?.width &&
      completedCrop?.height &&
      imgRef.current &&
      previewCanvasRef.current
    ) {
      canvasPreview(
        imgRef.current,
        previewCanvasRef.current,
        completedCrop,
      )
    }
  }, [completedCrop])

  return (
    <Form onSubmit={handleSubmit}>
      <Grid container>
        <Grid item xs={6}>
          <Controls.Input
            name="fullName"
            label="Full Name"
            value={values.fullName}
            onChange={handleInputChange}
            error={errors.fullName}
          />
          <Controls.RadioGroup
            name="role"
            label="Role"
            value={values.role}
            onChange={handleInputChange}
            items={roleItem}
          />
    <div className="Crop-Controls">
        <input type="file" accept="image/*" onChange={onSelectFile} />

      </div>
        </Grid>
        <Grid item xs={3}>
        {!!imgSrc && (
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={imgSrc}
            onLoad={onImageLoad}
            style={{height: '200px'}}
          />
        </ReactCrop>
      )}
          {selectedImage && (
            <div>
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Selected"
                style={{ maxWidth: '100%', maxHeight: '200px' }}
              />
            </div>
          )}
          </Grid>
        <Grid item xs={3}>
        {!!completedCrop && (
        <>
          <div>
            <p>Cropped Preview</p>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: '1px solid black',
                objectFit: 'contain',
                width: '100px',
                height: '100px',
              }}
            />
          </div>
        </>
      )}
       <div style={{ position: 'absolute', bottom: 20, right: 15 }}>
            <Button type="submit" variant="contained" color="primary">
              Submit
            </Button>
          </div>
        </Grid>
      </Grid>
    </Form>
  );
}
