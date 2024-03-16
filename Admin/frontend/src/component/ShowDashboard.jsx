import React, { useState, useEffect } from "react";
import axios from 'axios';
import {
  Paper,
  makeStyles,
  Toolbar,
  InputAdornment,
  MenuItem,
  Select,
} from "@material-ui/core";
import PageHeader from './UserPageHeader'
import StackedBarChartIcon from '@mui/icons-material/StackedBarChart';
import 'bootstrap/dist/css/bootstrap.min.css';
import Chart from 'react-apexcharts';
import FormControl from '@mui/material/FormControl';

const useStyles = makeStyles((theme) => ({
    pageContent: {
      padding: theme.spacing(3),
      height: '650px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    searchInput: {
      width: "75%",
      marginTop: '2px'
    },
    newButton: {
      position: "absolute",
      right: "10px",
    },
    uploadButton: {
      textAlign: 'center',
      marginBottom: theme.spacing(2),
    },
    selectMonth: {
      marginLeft: theme.spacing(2),
    },
  }));

  export default function Dashboard() {
    const classes = useStyles();
    const [selectedCSName, setSelectedCSName] = useState('');
    const [stackedBarChartData, setStackedBarChartData] = useState(null);
    const [stackedBarChartOut, setStackedBarChartOut] = useState(null);
    const [csNames, setCSNames] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:8081/Teacher')
            .then(response => {
                setCSNames(response.data);
            })
            .catch(error => console.log(error));
    }, []);

    useEffect(() => {
        fetchData(selectedCSName);
    }, [selectedCSName]);

    const handleCSNameChange = (event) => {
        setSelectedCSName(event.target.value);
    };

    const fetchData = (userId) => {
        fetch(`http://localhost:8081/dashboard?csName=${userId}`)
        .then(response => response.json())
        .then(data => setStackedBarChartData(data))
        .catch(error => console.error('Error fetching data:', error));
        fetch(`http://localhost:8081/dashout?csName=${userId}`)
        .then(response => response.json())
        .then(data => setStackedBarChartOut(data))
        .catch(error => console.error('Error fetching data:', error));
    };


    return (
        <>
            <PageHeader
                title="Chart"
                subTitle="Computer Science and Information KMUTNB"
                icon={<StackedBarChartIcon fontSize="large" style={{ transform: 'rotate(90deg)' }}/>}
            />
            <Paper className={classes.pageContent}>
                <Toolbar>
                    <FormControl variant="standard" sx={{ m: 1, minWidth: 250 }}>
                        <label htmlFor="teacher">Select Teacher</label>
                        <Select
                            value={selectedCSName}
                            onChange={handleCSNameChange}
                            className="mb-4"
                        >
                            {csNames.map((item) => (
                                <MenuItem key={item.CSID} value={item.CSName}>{item.CSName}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <React.Fragment>
                    <div className="container-fluid mb-3 text-center">
                        <div className='d-flex align-items-center justify-content-center'>
                            {stackedBarChartData && (
                                <Chart
                                    type="bar"
                                    width={550}
                                    height={300}
                                    series={stackedBarChartData.series}
                                    options={stackedBarChartData.options}
                                />
                            )}
                        </div>
                        <div className='d-flex align-items-center justify-content-center'>
                            {stackedBarChartOut && (
                                <Chart
                                    type="bar"
                                    width={550}
                                    height={300}
                                    series={stackedBarChartOut.series}
                                    options={stackedBarChartOut.options}
                                />
                            )}
                        </div>
                    </div>
                </React.Fragment>

                </Toolbar>
            </Paper>
        </>
    );
}
