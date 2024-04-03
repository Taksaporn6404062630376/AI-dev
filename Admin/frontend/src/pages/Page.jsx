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

  const handleDelete = async (userId) => {
    try {
        await axios.delete(`http://localhost:8081/deleteUser/${userId}`);
        const response = await fetch('http://localhost:8081/User');
        const newData = await response.json();

        const usersWithIds = newData.map((user, index) => ({ ...user, id: index + 1 }));
        setUser(usersWithIds);
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

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
            src={item.img_64}
            alt="image"
            style={{width:"50px", height:'50px'}}
            ></img></td>
            <td><button onClick={handleDelete}>Delete</button></td>
          </tr>
        ))}

      </tbody>
    </table>

    </div>
  </div>

)

}export default pages;