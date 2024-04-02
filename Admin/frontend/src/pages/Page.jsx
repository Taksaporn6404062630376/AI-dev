<<<<<<< HEAD
import React, { useState, useRef, useEffect } from 'react'
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop'
import {canvasPreview} from './canvasPreview'
import 'react-image-crop/dist/ReactCrop.css'

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

export default function App() {
  const [imgSrc, setImgSrc] = useState('')
  const previewCanvasRef = useRef(null)
  const imgRef = useRef(null)
  const hiddenAnchorRef = useRef(null)
  const blobUrlRef = useRef('')
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()
  const [aspect, setAspect] = useState(10 / 10)

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

  async function onDownloadCropClick() {
    const image = imgRef.current
    const previewCanvas = previewCanvasRef.current
    if (!image || !previewCanvas || !completedCrop) {
      throw new Error('Crop canvas does not exist')
    }

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    )
    const ctx = offscreen.getContext('2d')
    if (!ctx) {
      throw new Error('No 2d context')
    }

    ctx.drawImage(
      previewCanvas,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height,
      0,
      0,
      offscreen.width,
      offscreen.height,
    )

    const blob = await offscreen.convertToBlob({
      type: 'image/*',
    })

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
    }
    blobUrlRef.current = URL.createObjectURL(blob)

    if (hiddenAnchorRef.current) {
      hiddenAnchorRef.current.href = blobUrlRef.current
      hiddenAnchorRef.current.click()
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
    <div className="App">
      <div className="Crop-Controls">
        <input type="file" accept="image/*" onChange={onSelectFile} />

      </div>
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
            style={{width: '200px'}}
          />
        </ReactCrop>
      )}
      {!!completedCrop && (
        <>
          <div>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: '1px solid black',
                objectFit: 'contain',
                width: '50px',
                height: '50px',
              }}
            />
          </div>
          <div>
            <button onClick={onDownloadCropClick}>Download Crop</button>
          </div>
          <a
            href="#hidden"
            ref={hiddenAnchorRef}
            download
            style={{
              position: 'absolute',
              top: '-200vh',
              visibility: 'hidden',
            }}
          >
            Hidden download
          </a>
        </>
      )}
    </div>
  )
}
=======
import React, { useEffect, useState } from "react";
import axios from 'axios';
import Nav from '../Nav'

function pages () {
  const [data, setdata] = useState([]);
  const [searchterm, setsearchterm] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8081/User').then(response => {
      setdata(response.data)
    }).catch(error => console.log(error))
  }, [])

  const handlesearch = (event) => {
    setsearchterm(event.target.value)
  }
  
  const filterdata = data.filter((item) => 
    item.CSName.toLowerCase().includes(searchterm.toLowerCase())
  )


return(
  <div className="flex gap-6">
    <Nav />
    <div className="container">
    <div className="search-bar">
      <div className="search-wrapper">
      <input 
        type="text"
        onChange={handlesearch}
        value={searchterm}
        placeholder="Search data"
        className="search-input"
      />
      </div>
    </div>
    <table className="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Image</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {filterdata.map((item) => (
          <tr key={item.CSID}>
            <td>{item.CSName}</td>
            <td>{item.Role}</td>
            <td><img
            src={`../img_test/${item.CSID}.jpg`}
            alt="image"
            style={{width:"50px", height:'50px'}}
            ></img></td>
            <td><button>Delete</button></td>
          </tr>
        ))}

      </tbody>
    </table>

    </div>
  </div>

)

}export default pages;
>>>>>>> 852fb25947a8d0bb42dab4915f106e26b22b4f3a
