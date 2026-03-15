import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";

import { request, setAuthHeader } from "../helpers/axios_helper";

import { AuthContext } from "../context/authContext";

export default function AuthContent() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const { roles, languages } = useContext(AuthContext);

  useEffect(() => {
    request("GET", "/messages", {})
      .then((response) => {
        setData(response.data);
      })
      .catch((error) => {
        if (error.response.status === 401) {
          setAuthHeader(null);
        } else {
          setData(error.response.code);
        }
      });
  }, []);

  return (
    <div className="row justify-content-md-center">
      <div className="col-4">
        <div className="card" style={{ width: "18rem" }}>
          <div className="card-body">
            <h5 className="card-title">{t("content.backendResponse")}</h5>
            <p className="card-text">{t("content.content")}</p>
            <ul>{data && data.map((line) => <li key={line}>{line}</li>)}</ul>
            {roles && roles.length > 0 && (
              <div>
                <h6>{t("content.roles")}</h6>
                <ul>
                  {roles.map((role, index) => (
                    <li key={index}>{role}</li>
                  ))}
                </ul>
              </div>
            )}
            {languages && languages.length > 0 && (
              <div>
                <h6>{t("content.languages")}</h6>
                <ul>
                  {languages.map((language, index) => (
                    <li key={index}>{language.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
