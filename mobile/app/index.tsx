import { StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Redirect } from "expo-router";

export default function Index() {
  const [loginUser, setLoginUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = async () => {
      const token = SecureStore.getItem("accessToken");
      setLoginUser(token ? true : false);
      setLoading(false);
    };
    subscription();
  }, []);
  return (
    <>
      {loading ? (
        <></>
      ) : (
        <Redirect
          href={!loginUser ? "/(routes)/onboarding" : "/(tabs)/inde"}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({});
