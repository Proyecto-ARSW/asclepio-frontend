import type { NavSection } from '@/components/medical/sidebar-nav';
import { currentLocale } from '@/features/i18n/locale-path';
import { m } from '@/features/i18n/paraglide/messages';

interface DashboardContent {
	sidebar: {
		brandName: string;
		logout: string;
		sections: Record<NavSection, string>;
	};
	overview: {
		title: string;
		adminActionsTitle: string;
		manageHospitals: string;
		activeConnections: string;
		restLabel: string;
		graphqlLabel: string;
		stats: {
			hospitals: { title: string; subtitle: string };
			patients: { title: string; subtitle: string };
			appointments: { title: string; subtitle: string };
			queue: { title: string; subtitle: string };
		};
	};
	hospitals: {
		title: string;
		subtitle: string;
		createHospital: string;
		createFirstHospital: string;
		refresh: string;
		refreshLoading: string;
		empty: string;
	};
	patients: {
		title: string;
		subtitle: string;
		tableTitle: string;
		refresh: string;
		emptyTitle: string;
		emptyDescription: string;
		headers: {
			patient: string;
			document: string;
			eps: string;
			blood: string;
			registry: string;
		};
	};
	alerts: {
		tempSession: string;
		tempSessionAction: string;
		hospitalsLoadError: string;
		patientsLoadError: string;
	};
	comingSoon: {
		description: string;
	};
	settings: {
		title: string;
		description: string;
		language: {
			title: string;
			description: string;
			es: string;
			en: string;
		};
		theme: {
			title: string;
			description: string;
			light: string;
			dark: string;
			system: string;
		};
		dyslexia: {
			title: string;
			description: string;
			toggle: string;
		};
	};
	createHospitalModal: {
		title: string;
		description: string;
		successTitle: string;
		successDescription: string;
		close: string;
		primaryInfo: string;
		contactInfo: string;
		fields: {
			name: string;
			department: string;
			city: string;
			address: string;
			nit: string;
			phone: string;
			institutionType: string;
			emergencyCapacity: string;
			consultingRooms: string;
			contactEmail: string;
		};
		placeholders: {
			name: string;
			department: string;
			city: string;
			address: string;
			nit: string;
			phone: string;
			institutionType: string;
			emergencyCapacity: string;
			consultingRooms: string;
			contactEmail: string;
		};
		actions: {
			cancel: string;
			submit: string;
			submitLoading: string;
		};
		errors: {
			nameRequired: string;
			departmentRequired: string;
			cityRequired: string;
			addressRequired: string;
			submit: string;
		};
	};
}

export function getDashboardContent(
	locale = currentLocale(),
): DashboardContent {
	const options = { locale } as const;
	return {
		sidebar: {
			brandName: m.dashboardSidebarBrandName({}, options),
			logout: m.dashboardSidebarLogout({}, options),
			sections: {
				overview: m.dashboardSidebarOverview({}, options),
				hospitals: m.dashboardSidebarHospitals({}, options),
				patients: m.dashboardSidebarPatients({}, options),
				appointments: m.dashboardSidebarAppointments({}, options),
				queue: m.dashboardSidebarQueue({}, options),
				medicines: m.dashboardSidebarMedicines({}, options),
				doctors: m.dashboardSidebarDoctors({}, options),
				settings: m.dashboardSidebarSettings({}, options),
			},
		},
		overview: {
			title: m.dashboardOverviewTitle({}, options),
			adminActionsTitle: m.dashboardOverviewAdminActionsTitle({}, options),
			manageHospitals: m.dashboardOverviewManageHospitals({}, options),
			activeConnections: m.dashboardOverviewActiveConnections({}, options),
			restLabel: m.dashboardOverviewRestLabel({}, options),
			graphqlLabel: m.dashboardOverviewGraphqlLabel({}, options),
			stats: {
				hospitals: {
					title: m.dashboardOverviewStatsHospitalsTitle({}, options),
					subtitle: m.dashboardOverviewStatsHospitalsSubtitle({}, options),
				},
				patients: {
					title: m.dashboardOverviewStatsPatientsTitle({}, options),
					subtitle: m.dashboardOverviewStatsPatientsSubtitle({}, options),
				},
				appointments: {
					title: m.dashboardOverviewStatsAppointmentsTitle({}, options),
					subtitle: m.dashboardOverviewStatsAppointmentsSubtitle({}, options),
				},
				queue: {
					title: m.dashboardOverviewStatsQueueTitle({}, options),
					subtitle: m.dashboardOverviewStatsQueueSubtitle({}, options),
				},
			},
		},
		hospitals: {
			title: m.dashboardHospitalsTitle({}, options),
			subtitle: m.dashboardHospitalsSubtitle({}, options),
			createHospital: m.dashboardHospitalsCreate({}, options),
			createFirstHospital: m.dashboardHospitalsCreateFirst({}, options),
			refresh: m.dashboardHospitalsRefresh({}, options),
			refreshLoading: m.dashboardHospitalsRefreshLoading({}, options),
			empty: m.dashboardHospitalsEmpty({}, options),
		},
		patients: {
			title: m.dashboardPatientsTitle({}, options),
			subtitle: m.dashboardPatientsSubtitle({}, options),
			tableTitle: m.dashboardPatientsTableTitle({}, options),
			refresh: m.dashboardPatientsRefresh({}, options),
			emptyTitle: m.dashboardPatientsEmptyTitle({}, options),
			emptyDescription: m.dashboardPatientsEmptyDescription({}, options),
			headers: {
				patient: m.dashboardPatientsHeaderPatient({}, options),
				document: m.dashboardPatientsHeaderDocument({}, options),
				eps: m.dashboardPatientsHeaderEps({}, options),
				blood: m.dashboardPatientsHeaderBlood({}, options),
				registry: m.dashboardPatientsHeaderRegistry({}, options),
			},
		},
		alerts: {
			tempSession: m.dashboardAlertTempSession({}, options),
			tempSessionAction: m.dashboardAlertTempSessionAction({}, options),
			hospitalsLoadError: m.dashboardAlertHospitalsLoadError({}, options),
			patientsLoadError: m.dashboardAlertPatientsLoadError({}, options),
		},
		comingSoon: {
			description: m.dashboardComingSoonDescription({}, options),
		},
		settings: {
			title: m.dashboardSettingsTitle({}, options),
			description: m.dashboardSettingsDescription({}, options),
			language: {
				title: m.dashboardSettingsLanguageTitle({}, options),
				description: m.dashboardSettingsLanguageDescription({}, options),
				es: m.dashboardSettingsLanguageEs({}, options),
				en: m.dashboardSettingsLanguageEn({}, options),
			},
			theme: {
				title: m.dashboardSettingsThemeTitle({}, options),
				description: m.dashboardSettingsThemeDescription({}, options),
				light: m.dashboardSettingsThemeLight({}, options),
				dark: m.dashboardSettingsThemeDark({}, options),
				system: m.dashboardSettingsThemeSystem({}, options),
			},
			dyslexia: {
				title: m.dashboardSettingsDyslexiaTitle({}, options),
				description: m.dashboardSettingsDyslexiaDescription({}, options),
				toggle: m.dashboardSettingsDyslexiaToggle({}, options),
			},
		},
		createHospitalModal: {
			title: m.dashboardCreateHospitalTitle({}, options),
			description: m.dashboardCreateHospitalDescription({}, options),
			successTitle: m.dashboardCreateHospitalSuccessTitle({}, options),
			successDescription: m.dashboardCreateHospitalSuccessDescription(
				{},
				options,
			),
			close: m.dashboardCreateHospitalClose({}, options),
			primaryInfo: m.dashboardCreateHospitalPrimaryInfo({}, options),
			contactInfo: m.dashboardCreateHospitalContactInfo({}, options),
			fields: {
				name: m.dashboardCreateHospitalFieldName({}, options),
				department: m.dashboardCreateHospitalFieldDepartment({}, options),
				city: m.dashboardCreateHospitalFieldCity({}, options),
				address: m.dashboardCreateHospitalFieldAddress({}, options),
				nit: m.dashboardCreateHospitalFieldNit({}, options),
				phone: m.dashboardCreateHospitalFieldPhone({}, options),
				institutionType: m.dashboardCreateHospitalFieldInstitutionType(
					{},
					options,
				),
				emergencyCapacity: m.dashboardCreateHospitalFieldEmergencyCapacity(
					{},
					options,
				),
				consultingRooms: m.dashboardCreateHospitalFieldConsultingRooms(
					{},
					options,
				),
				contactEmail: m.dashboardCreateHospitalFieldContactEmail({}, options),
			},
			placeholders: {
				name: m.dashboardCreateHospitalPlaceholderName({}, options),
				department: m.dashboardCreateHospitalPlaceholderDepartment({}, options),
				city: m.dashboardCreateHospitalPlaceholderCity({}, options),
				address: m.dashboardCreateHospitalPlaceholderAddress({}, options),
				nit: m.dashboardCreateHospitalPlaceholderNit({}, options),
				phone: m.dashboardCreateHospitalPlaceholderPhone({}, options),
				institutionType: m.dashboardCreateHospitalPlaceholderInstitutionType(
					{},
					options,
				),
				emergencyCapacity:
					m.dashboardCreateHospitalPlaceholderEmergencyCapacity({}, options),
				consultingRooms: m.dashboardCreateHospitalPlaceholderConsultingRooms(
					{},
					options,
				),
				contactEmail: m.dashboardCreateHospitalPlaceholderContactEmail(
					{},
					options,
				),
			},
			actions: {
				cancel: m.dashboardCreateHospitalActionCancel({}, options),
				submit: m.dashboardCreateHospitalActionSubmit({}, options),
				submitLoading: m.dashboardCreateHospitalActionSubmitLoading(
					{},
					options,
				),
			},
			errors: {
				nameRequired: m.dashboardCreateHospitalErrorNameRequired({}, options),
				departmentRequired: m.dashboardCreateHospitalErrorDepartmentRequired(
					{},
					options,
				),
				cityRequired: m.dashboardCreateHospitalErrorCityRequired({}, options),
				addressRequired: m.dashboardCreateHospitalErrorAddressRequired(
					{},
					options,
				),
				submit: m.dashboardCreateHospitalErrorSubmit({}, options),
			},
		},
	};
}
