import { gql } from "apollo-boost";

export const REGISTER_PATIENT = gql`
  mutation RegisterPatient($input: RegisterPatientInput!) {
    registerPatient(input: $input) {
      id
      name
    }
  }
`;

export const ADD_VITAL_SIGNS = gql`
  mutation AddVitalSigns($input: AddVitalSignsInput!) {
    addVitalSigns(input: $input) {
      id
      status
    }
  }
`;

export const GET_PATIENT_HISTORY = gql`
  query GetPatientHistory($patientId: ID!) {
    patientHistory(patientId: $patientId) {
      id
      history {
        date
        notes
      }
    }
  }
`;

export const ADD_DOCTOR_COMMENT = gql`
  mutation AddDoctorComment($input: AddCommentInput!) {
    addDoctorComment(input: $input) {
      id
      comment
    }
  }
`;