import { useContext } from "react";
import { UserContext } from "./UserContext";
import UserProvider from './UserProvider'


export const useUser = () => {
 return useContext(UserContext)
}
