import { useContext } from "react";
import { UserContext } from "./UserContext";

// Small hook to access the user context values
export const useUser = () => {
    return useContext(UserContext)
}
