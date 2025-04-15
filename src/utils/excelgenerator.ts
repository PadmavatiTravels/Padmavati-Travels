interface ExcelReportOptions {
    title: string
    data: any[]
    columns: string[]
    reportType: string
  }
  
  export const generateExcelReport = async (options: ExcelReportOptions): Promise<void> => {
    const { title, data, columns, reportType } = options
  
    try {
      // Format the data for the API
      const formattedData = {
        reportTitle: title,
        reportDate: new Date().toLocaleDateString(),
        reportType: reportType,
        columns: columns,
        items: data.map((item, index) => {
          const row: Record<string, any> = { id: index + 1 }
  
          // Map data properties to columns
          columns.forEach((col) => {
            const key = col.replace(/\s+/g, "")
            switch (col) {
              case "LR No.":
                row[key] = item.id || ""
                break
              case "Date":
              case "Booking Date":
                row[key] = item.date || item.bookingDate || ""
                break
              case "Branch":
                row[key] = item.branch || "Bangalore"
                break
              case "From":
                row[key] = item.from || item.consignorName || ""
                break
              case "Destination":
              case "To":
                row[key] = item.destination || item.to || item.deliveryDestination || ""
                break
              case "Type":
                row[key] = item.type || item.bookingType || ""
                break
              case "Status":
                row[key] = item.status || "N/A"
                break
              case "Amount":
                row[key] = item.amount ? `₹${item.amount.toFixed(2)}` : "N/A"
                break
              case "Dispatch Date":
                row[key] = item.dispatchDate || "N/A"
                break
              case "Delivery Date":
                row[key] = item.deliveryDate || "N/A"
                break
              default:
                row[key] = item[col.toLowerCase().replace(/\s+/g, "")] || "N/A"
            }
          })
          return row
        }),
      }
  
      // Create a simple Excel template in base64
      // This is a basic template - in a real scenario, you would have a proper template file
      const templateBase64 =
        "UEsDBBQABgAIAAAAIQCvdEI6rQEAAI0GAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACsVctu2zAQvBfoPwi8FhKdHoqisJxDmhzbAEk/gCHXEmG+wN0k9t93STtGEThWDfsiSqR2ZnZIjebXa++aF8hoY+jFVTcTDQQdjQ1DL/483rXfRYOkglEuBujFBlBcLz5/mj9uEmDD1QF7MRKlH1KiHsEr7GKCwCvLmL0ifsyDTEqv1ADy62z2TeoYCAK1VDDEYv4TlurZUXO75umtkicbRHOzfa9Q9UKl5KxWxELlSzDvSNq4XFoNJupnz9AdpgzK4AhA3nUpW2bMD0DEjaGQBzlTGN5xWl80l/nDFRkcniZz50PHlbUVHG3CL2zWBwxl5WMfdnW/eQOzNdDcq0y/lGe35NrJ15hXTzGuuuMgp5pZTe28suFN9xH++jLKOlxdWEjprwJP6CA+lSDr9XwJFWaCEGnjAC9tewWdYh5VBvNAfN6Hiwv4F3tCh8nqtUiQu5vzfd8BTfAmTrIYUG7H/9gBjy2sNXBE1MoJeK2cvhn55F94b/e4x/g52+5zTMjxmeF0AW/JU6rbxECQycI+ew59w3tGzt6zO4YS7gbMAW5ZfyaLvwAAAP//AwBQSwMEFAAGAAgAAAAhALVVMCP0AAAATAIAAAsACAJfcmVscy8ucmVscyCiBAIooAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACskk1PwzAMhu9I/IfI99XdkBBCS3dBSLshVH6ASdwPtY2jJBvdvyccEFQagwNHf71+/Mrb3TyN6sgh9uI0rIsSFDsjtnethpf6cXUHKiZylkZxrOHEEXbV9dX2mUdKeSh2vY8qq7iooUvJ3yNG0/FEsRDPLlcaCROlHIYWPZmBWsZNWd5i+K4B1UJT7a2GsLc3oOqTz5t/15am6Q0/iDlM7NKZFchzYmfZrnzIbCH1+RpVU2g5abBinnI6InlfZGzA80SbvxP9fC1OnMhSIjQS+DLPR8cloPV/WrQ08cudecQ3CcOryPDJgosfqN4BAAD//wMAUEsDBBQABgAIAAAAIQBogo0xzgMAAFIJAAAPAAAAeGwvd29ya2Jvb2sueG1srFVtb+o2FP4+af8hi/o1OM4rRIWrAIlWqb1ClLXbviA3MWCR2MxxClV1//s9DgTomCbWO9TaObbz+DnnPOfk9suuLIxXKismeN/EHds0KM9Ezviyb/42S62uaVSK8JwUgtO++UYr88vg559ut0KuX4RYGwDAq765UmoTIVRlK1qSqiM2lMPOQsiSKDDlElUbSUleryhVZYEc2w5QSRg39wiRvAZDLBYso2OR1SXlag8iaUEU0K9WbFO1aGV2DVxJ5LreWJkoNwDxwgqm3hpQ0yiz6G7JhSQvBbi9w76xk/AXwD+2YXDam2Dr4qqSZVJUYqE6AI32pC/8xzbC+EMIdpcxuA7JQ5K+Mp3DIysZfJJVcMQKTmDY/mE0DNJqtBJB8D6J5h+5OebgdsEK+rSXrkE2m6+k1JkqTKMglUpypmjeN0MwxZaeFsArWW+GNStg1/FDJzDR4CjniQQDch8XikpOFB0JrkBqB+o/KqsGe7QSIGJjSv+qmaRQOyAhcAdGkkXkpZoQtTJqWeyDVEFV5Z1cZFWnYK+0w6lClGa0R93Q9xcYEzdD61rWa8EJ2hXVzlK03EBNUIvyJeMUtTY60yy5LJD/oFqS6aAhCNTemf3z34MGPsmoVeZESQOe78b3kJ1H8gq5cj3TAMeaWr6DbGB3zjMZ4fl7EKR45A9TK0k8bHmhF1jdkTeykq4ddJ0w7aZB+A28kUGUCVKr1UEHGrtvepD0i60Hsmt3sB3VLD/xeLfD1EmCsWs5XbjEc4PEip0gteIYnp0Ah64bfNMe6473xOi2OilGm8bumfFcbMGF0AOdvx1Np9cDe9vsPrNcrUBznu/47dqvlC1XQNlxAhsWoTQ0tb75bh9+FsxjPdhWCr9maPcaSuiMU9NcgVszG7wpiEfdcDF0cT03UYYCiPQd8i7HTRrb13K6ALnkupAA5Mw6QM13BS87E8m4msfQzHVpZaRobtDItjnY3/bLTXyDo5s/b1z7Fp3hgEw+3gFvZxNp6Kmh1sO209Oc6E7dV6qZoRQYBAR7dhzaPc+yE9e3vG7Psbqe61gjb+wkfpiMk6GvJaE/R9H/0ZSbioza75xmuSJSzSTJ1vB1nNLFkFQg4n0Ige852aHfHdouUPRSnFoe7tnWcBh4lj9OXT/E41Hipyey2v3FJ1tiFzVvU6Jq6CW6jTR2pMf0sHpcXOwXDun8UO/RdKzjfnj73w4+gvcFvfJw+nTlwdHXh9nDlWfvk9n8Ob32cPwwHMfXn4+n0/iPWfJ7ewX6x4CiJuF6bGSKWpkMvgMAAP//AwBQSwMEFAAGAAgAAAAhAEXiwUknAQAAvAMAABoACAF4bC9fcmVscy93b3JrYm9vay54bWwucmVscyCiBAEooAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKyTy07DMBBF90j8g+U9maRAQahJFyCkbiF8gOVMHmr8kMc88vdYCTSJVMImG0szI997PLre7b9Uyz7QUWN0ypMo5wy1NEWjq5S/5c9X95yRF7oQrdGY8g6J77PLi90LtsKHS1Q3llhQ0ZTy2nv7AECyRiUoMhZ1mJTGKeFD6SqwQh5FhbCJ4y24qQbPZprsUKTcHYprzvLOBuf/tU1ZNhKfjHxXqP0ZCyDfteEBLBeuQp/yoY4CI4fz9ps17X1YC47ufQn9mSwxJGsyfBp3pBrRjxynFkE/WYTZrgkjRSsfa9HoEebUWtrI7R8QqpHOkCl9JI2CIQ8hB8kdJPE8bWBD5s3Ed6jpp79kfrNqImvhsHj1Lny4aTCn7V8YmP257BsAAP//AwBQSwMEFAAGAAgAAAAhAEaWBLHTCAAAiSkAABgAAAB4bC93b3Jrc2hlZXRzL3NoZWV0MS54bWyck9uK2zAQhu8LfQeh+0Q+7G6bEGfZbgldKGVpeqCXijyORSTLleQcWvruHfmQBFJoWGPL8sjz/TOj0ex+rxXZgnXSVBmNxxElUAmTy2qd0a9fFqO3lDjPq5wrU0FGD+Do/fz1q9nO2I0rATxBQuUyWnpfTxlzogTN3djUUOFKYazmHj/tmrnaAs9bJ61YEkV3THNZ0Y4wtdcwTFFIAe+NaDRUvoNYUNxj/K6UtRtoWlyD09xumnokjK4RsZJK+kMLpUSL6dO6MpavFOa9j2+4IHuLd4JPOsi09gslLYU1zhR+jGTWxXyZ/oRNGBdH0mX+V2HiG2ZhK8MGnlDJy0KKb4+s5ARLXwi7O8JCuey0kXlGf0f9NcJ3HIboNAxrf+h8lkvc4ZAVsVBk9CGe/kgjyuaztoG+Sdi5sznxfLUEBcIDisSUbPGHjNZ8De+w6zbPoUawo+SXMXopeNjTGHmn70+hUxVao3PrMrT4R34wjQ+SvVNo/pUxm2B6Qr0I43WteoiXCy+38AgKaQ9YR/ezyyAJ0bNj+OfzIZVFe1yeLcmh4I3yj0Z9l7kvM4ol7G2fze4DyHXpMRg8naJx3uijJWgIoxCII9EynGr8S/N9N9n1uPEtJStwfiEDZ8D0YnFP6f0ngz9Ojv5xgoRO/J9eKUJb1RRL0HtNxumb/+qyNvy/AAAA//8AAAD//5Tay3LbNhSA4Vdx1V03Din51pE9Y10pkRTvt6XH4zRdtOnEbvr6BSmAAPjLCywyk3w5OCSBQxAEtXz/9vb2sXn5eHla/vj+39WPx5k3u3r/5+Xvd/G33/2b2dW3D/G3+9nV67/vH9//Ct7+/GOQ2dPytQ9/FvEi4l38++eTd7O8/vm0vH4Vf0S6MafvlrMW8WNO/3bMORyw65OJU/pixtxfPu7c7bhxH/848x/MS1rYhz+NMdeyBxJICskgOaSAlJAKUkMaSAvpTLGGauHYZX380GWqO06QBJJCMkgOKSAlpILUkAbSQjpTrA4St4TL/RH38XYHQRJICskgOaSAlJAKUkMaSAvpTLE66M6tg1YifrzZ55fvY3FDuvT5qo9/nC1EkY+ZJ7fxegxRdbuBbKVYs5FnTwe7MUbl2UMCyAFyhISQCBJDkguX/sU+5RQXmkFySAEpL3WPbx+rwgnWkAbSQjpTrGrrnwNOtTE0mBSHfmwNj5i1jhmrg7RVZNXHJNVOB40FQgpIB9KRFJIiUkxKLnXDpLZTXnNGykkFqbzYWfp2H/q94nnWpIbUkjqL7JJxXOIkXt9gUjKTQk91jBrnjJSTClKpyCqsyQRW6SB1wJrUkFpSZ5HdV45LqJV3XlmIx+c49U4WcGsZcjPTN9e5kZYtYnaQPSSAHCBHSAiJILGU2/GcT1J8sTQer/TOnv0SFaObpaRM0d2YPNdROrle4w43S8FMJTNVlzI92KdZM1NDakmdpMWiP3O7bhzXkStPLrjMxcBkPlrLGM8onHMrLVvE7CB7SAA5QI6QEBJBYil6bE+ISSApJEOeHDEFpESrCjE1pIG0kE7KnCPvuEBeeXIlOY7qWor5ZjmfzLebMUZNIlvIDrKHBJAD5AgJIREklmKO/PlKdbUmaJVCMuTJEVNASrSqEFNDGkgL6aRcGPlb16VY3+BxNjdf5efThbong8y7HrRl1I60JwWkA+lICkkRKVbkGw8Oefbm28l8smxMVLthZh3m+5SUKdIPzlyROIh+q5o8gQsVpGuzVHQ/nmilSKy9Rao3scPz9enk3f4mjrG8/trv9/xaP0fV9pfp4+R8gYsvY6pGpjKoJXWKhqG2HyeuL5Ve30DsEul+Xyuy+n3yxN7oID2vyFRDwQ9DsWPUnhSQDqQjKSRFpFiRLpGTIl0PCSklZYr0QiVXpGukIJWKzLKR/fUwDn+tojQ1pJbUSfKHUrIrQqy73N77+gaTipCkR3bT73T2UZq2pB1pTwpIB9KRFJIiUqzIHH959ub4g1LVUEdliszxlw3N8QeVqqE5/jLKHH9QoxrqqJbUSbo0/v2OgMM+9co7byFYM4Ika0aYvJNuVDuzIsZ2apLYMWpPCkgH0pEUkiJSrMisCHmqZkWAUtXQrAgZZVaEJLMiQKXKZVaEjDIrAtSohmZFIKqTURcqQpBbRQwNxNas+SFh8jxYyxhj8QHZQnaQPSSAHCBHSAiJILEUY+GJmASSQjLkyRFTQEq0qhBTQxpIC+mkcOHpO27orIYGYuTFelx/u8LQn3d9fL2E2Kh2mrakHWlPCkgH0pEUkiJSrEhPWydFxvsHG6akjLlynctYZk53KJiqZKrqUip/ukXBVA2pJXWKuEUhBtZxvpBfHnX/rYccYrlgzg+I2jJqR9qTAtKBdCSFpIgUk06khJSSMlJOKkglqSLVpIbUkjqL7I/SjlubqX/epTy/DskP3p98sPIdt7/SvoGeiiZfbPIh3ePM3Gr09B1iX5Xj9ktqT4KTLbe8/1+xHjaP7Ouzs4/s+Pqf+uY7qvfJJ3zf8c0v7RvontTbRva5Oq4en63fBMw/6YF+I8PptxPWzkf/Vm39eOJa/zjjfwAAAP//AAAA//9sksFuwjAMhl8lygOMpgimRpRDBwcOHYOWQ48ZNW20kkQmDImnn2GCHeZb7E//7z+JZ0fADt5gGE5i788u5jJN5Xz2bAuEQy7LsW4mcvSvX6ipLtWUIe9ENizZEqlZsiPSsKTOdJMxU2qlSKFYkhBJGLLOdMV5rVWiK15BUyp2SpHpBedVkNeC9VpmuuQUS1KUrGKn6PHVmHvjVOlNyt1+S6RmyY5Iw5KCSMm7UYKaT0Bk80tGf5s0n4XeO4h2/4Hi4F1ctbm8xwymg9JgZ91JDHCgbUteXqVA2/WPc/Th3p1I8elj9MdH1YNpAW/VWJKrj4+C1vLmW0E8BxFMAKzsFXKZSeHRgosmWu9yGTxGNDZK0VP/SrnMsAiWHKX4BqS4fzVqS5lx1d5jt2gu1nXi2U1vvzG6ePw69QBx/gMAAP//AwBQSwMEFAAGAAgAAAAhAE0/gCyEBgAAgBoAABMAAAB4bC90aGVtZS90aGVtZTEueG1s7FnPb9s2FL4P2P8g6O5atiXZDuoUtmwna5O2aNwOPdI2bbGhREOkkxpFgV13GTCgG3YZsNsOw4AC22mX/Tcttu6P2CMlW2RMN/2RAt3QGAgk6nuPH997+vhD1288TqhzhjNOWNpxa9c818HphE1JOu+490fDSst1uEDpFFGW4o67wty9cf/5Z9fRnohxgh2wT/ke6rixEIu9apVPoBnxa2yBU3g2Y1mCBNxm8+o0Q+fgN6HVuueF1QSR1HVSlIDbO7MZmWBnJF26+2vnAwq3qeCyYUKzE+kaGxYKOz2tSQRf8YhmzhmiHRf6mbLzEX4sXIciLuBBx/XUn1vdv15Fe4URFTtsNbuh+ivsCoPpaV31mc3Hm079P/CD7sa/AlCxjRs0B+Eg3PhTADSZwEhzLrrPoNfu9YMCq4HyS4vvfrPfqBl4zX9ji3M3kD8Dr0C5f38LPxxGEEUDr0A5PrDEpFmPfAOvQDk+3MI3vW7fbxp4BYopSU+30F4QNqL1aDeQGaOHVng78IfNeuG8REE1bKpLdjFjqdhVawl6xLIhACSQIkFSR6wWeIYmUMURomScEeeIzGMovAVKGYdmr+4NvQb8lz9fXamIoD2MNGvJC5jwrSbJx+GTjCxEx70JXl0N8nDpHDARk0nRq3JiWByidK5bvPr5279+/Mr5+7efXj37Lu/0Ip7r+Je/fv3yjz9f5x7GWgbhxffPX/7+/MUP3/z1yzOL926Gxjp8RBLMndv43LnHEhiahT8eZ29nMYoRMSxQDL4trgcQOB14e4WoDdfDZggfZKAvNuDB8pHB9STOloJYer4VJwbwmDHaY5k1ALdkX1qER8t0bu88W+q4ewid2fqOUGokeLBcgLASm8soxgbNuxSlAs1xioUjn7FT"
  
      // Prepare the API request
      const url = "https://xlsx-template.p.rapidapi.com/mail/send"
      const options = {
        method: "POST",
        headers: {
          "x-rapidapi-key": "4cd21529e4msh9babd1a1983e279p11fb59jsnbd23fd8e4285",
          "x-rapidapi-host": "xlsx-template.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mailConfig: {
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: true,
            auth: {
              user: "8a65bc001@smtp-brevo.com",
              pass: "ZB7jX85PnCSgamAO",
            },
          },
          mail: {
            from: "Padmavati Travels <padmavatitravels78@gmail.com>",
            to: "Reports <padmavatitravels78@gmail.com>",
            subject: title,
            text: `Report generated on ${new Date().toLocaleDateString()}`,
            html: `<p>Please find the attached ${title} report.</p>`,
          },
          attachments: [
            {
              downloadFilename: `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`,
              templateFileBase64: templateBase64,
              jsonData: formattedData,
            },
          ],
        }),
      }
  
      // Make the API request
      const response = await fetch(url, options)
  
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
  
      const result = await response.text()
      console.log("Excel report generation result:", result)
  
      // Since the API sends the report via email, we'll also create a local download
      // for immediate user feedback
      createLocalExcelDownload(title, formattedData)
    } catch (error) {
      console.error("Error generating Excel report:", error)
      // Fallback to local generation if API fails
      createLocalExcelDownload(title, data)
      throw error
    }
  }
  
  // Fallback function to create a local Excel download if the API fails
  async function createLocalExcelDownload(title: string, data: any) {
    try {
      // Import xlsx library dynamically
      const XLSX = await import("xlsx")
  
      // Create a new workbook
      const wb = XLSX.utils.book_new()
  
      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(data)
  
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Report")
  
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  
      // Create Blob and download
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error in fallback Excel generation:", error)
    }
  }
  