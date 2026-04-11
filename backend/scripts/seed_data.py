#!/usr/bin/env python3
"""
ICARUS 백엔드 더미 데이터 생성 스크립트
API를 통해 자동으로 테스트 데이터를 생성합니다.
"""

import requests
import json
import time
import random
from typing import Optional, Dict, Any, List

BASE_URL = "https://icarus-production-23db.up.railway.app/v1"

# 색상 코드 (출력용)
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

def print_step(step_num: int, message: str):
    """단계 메시지 출력"""
    print(f"\n{BOLD}{BLUE}[Step {step_num}]{RESET} {message}")

def print_success(message: str):
    """성공 메시지 출력"""
    print(f"{GREEN}✓ {message}{RESET}")

def print_error(message: str):
    """에러 메시지 출력"""
    print(f"{RED}✗ {message}{RESET}")

def print_info(message: str):
    """정보 메시지 출력"""
    print(f"{YELLOW}→ {message}{RESET}")

class IcarusSeeder:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.user_ids = {}  # 이메일 -> user_id 매핑
        self.course_ids = {}  # 과정명 -> course_id 매핑
        self.instructor_ids = {}  # 이메일 -> user_id 매핑
        self.mentor_ids = {}  # 이메일 -> user_id 매핑
        self.student_ids = {}  # 이메일 -> user_id 매핑
        self.unit_ids = {}  # course_id -> [unit_ids]
        self.section_ids = {}  # unit_id -> [section_ids]

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None,
                     token: Optional[str] = None, expect_status: int = 200) -> Optional[Dict]:
        """API 요청 수행"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}

        if token:
            headers["Authorization"] = f"Bearer {token}"

        try:
            if method == "GET":
                response = self.session.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            elif method == "PATCH":
                response = self.session.patch(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            if response.status_code == expect_status:
                if response.text:
                    return response.json()
                return {"success": True}
            else:
                print_error(f"{method} {endpoint}: {response.status_code} - {response.text[:200]}")
                return None
        except Exception as e:
            print_error(f"Request failed: {str(e)}")
            return None

    def step1_admin_login(self):
        """Step 1: Admin 계정으로 로그인"""
        print_step(1, "Admin 계정으로 로그인")

        login_data = {
            "email": "admin@icarus.com",
            "password": "icarus1234"
        }

        response = self._make_request("POST", "/auth/login", login_data)
        if response and "access_token" in response:
            self.admin_token = response["access_token"]
            print_success(f"Admin 로그인 성공 (Token: {self.admin_token[:20]}...)")
            return True
        else:
            print_error("Admin 로그인 실패")
            return False

    def step2_cleanup_courses(self):
        """Step 2: 기존 테스트 데이터 정리"""
        print_step(2, "기존 테스트 데이터 정리")

        # 모든 과정 조회
        response = self._make_request("GET", "/courses", token=self.admin_token)
        if not response:
            print_error("과정 목록 조회 실패")
            return False

        courses = response if isinstance(response, list) else []
        delete_count = 0

        for course in courses:
            course_id = course.get("id")
            course_name = course.get("title", "Unknown")

            # DELETE 요청 (204 No Content 기대)
            response = self._make_request("DELETE", f"/courses/{course_id}",
                                        token=self.admin_token, expect_status=204)
            if response is not None:
                delete_count += 1
                print_info(f"과정 삭제: {course_name} (ID: {course_id})")

        print_success(f"기존 과정 {delete_count}개 삭제 완료")
        return True

    def step3_create_courses(self):
        """Step 3: 과정 5개 생성"""
        print_step(3, "과정 5개 생성")

        courses_data = [
            {"title": "프론트엔드 개발자 과정", "duration_months": 6},
            {"title": "백엔드 개발자 과정", "duration_months": 6},
            {"title": "보안 전문가 과정", "duration_months": 4},
            {"title": "빅데이터 분석 과정", "duration_months": 5},
            {"title": "AI 활용 과정", "duration_months": 3}
        ]

        success_count = 0
        for course_data in courses_data:
            response = self._make_request("POST", "/courses", course_data, token=self.admin_token, expect_status=201)
            if response and "id" in response:
                course_id = response["id"]
                course_name = course_data["title"]
                self.course_ids[course_name] = course_id
                self.unit_ids[course_id] = []
                print_success(f"과정 생성: {course_name} (ID: {course_id})")
                success_count += 1
            else:
                print_error(f"과정 생성 실패: {course_data['title']}")

        print_success(f"총 {success_count}/{len(courses_data)}개 과정 생성 완료")
        return success_count == len(courses_data)

    def step4_create_units(self):
        """Step 4: 각 과정에 단원 3개씩 생성"""
        print_step(4, "각 과정에 단원 3개씩 생성")

        unit_names = ["오리엔테이션", "기초", "심화"]
        total_units = 0

        for course_name, course_id in self.course_ids.items():
            print_info(f"과정 '{course_name}'에 단원 생성...")
            course_units = []

            for unit_order, unit_name in enumerate(unit_names):
                unit_data = {
                    "title": f"{unit_order}단원: {unit_name}",
                    "order_index": unit_order
                }

                response = self._make_request("POST", f"/courses/{course_id}/units",
                                            unit_data, token=self.admin_token, expect_status=201)
                if response and "id" in response:
                    unit_id = response["id"]
                    course_units.append(unit_id)
                    self.section_ids[unit_id] = []
                    print_success(f"  단원 생성: {unit_data['title']} (ID: {unit_id})")
                    total_units += 1
                else:
                    print_error(f"  단원 생성 실패: {unit_data['title']}")

            self.unit_ids[course_id] = course_units

        print_success(f"총 {total_units}개 단원 생성 완료")
        return total_units == len(self.course_ids) * 3

    def step5_create_sections(self):
        """Step 5: 각 단원에 섹션 3개씩 생성"""
        print_step(5, "각 단원에 섹션 3개씩 생성")

        total_sections = 0

        for course_name, course_id in self.course_ids.items():
            unit_ids = self.unit_ids.get(course_id, [])
            print_info(f"과정 '{course_name}' 단원들에 섹션 생성...")

            for unit_id in unit_ids:
                for section_order in range(3):
                    section_data = {
                        "title": f"섹션 {section_order + 1}",
                        "order": section_order
                    }

                    response = self._make_request("POST", f"/courses/{course_id}/units/{unit_id}/sections",
                                                section_data, token=self.admin_token, expect_status=201)
                    if response and "lesson_id" in response:
                        section_id = response["lesson_id"]
                        self.section_ids[unit_id].append(section_id)
                        print_success(f"  섹션 생성: {section_data['title']} (ID: {section_id})")
                        total_sections += 1
                    else:
                        print_error(f"  섹션 생성 실패: {section_data['title']}")
                        if response:
                            print_info(f"    응답: {response}")

        expected_sections = len(self.course_ids) * 3 * 3  # 5 과정 * 3 단원 * 3 섹션
        print_success(f"총 {total_sections}/{expected_sections}개 섹션 생성 완료")
        return total_sections == expected_sections

    def step6_create_instructors(self):
        """Step 6: 강사 계정 3개 생성"""
        print_step(6, "강사 계정 3개 생성")

        instructors_data = [
            {"email": "instructor1@icarus.com", "password": "icarus1234", "title": "김철수"},
            {"email": "instructor2@icarus.com", "password": "icarus1234", "title": "이영희"},
            {"email": "instructor3@icarus.com", "password": "icarus1234", "title": "박지민"}
        ]

        success_count = 0
        for instructor in instructors_data:
            register_data = {
                "email": instructor["email"],
                "password": instructor["password"],
                "name": instructor["title"],
                "role": "instructor"
            }

            # 생성 시도
            response = self._make_request("POST", "/auth/register", register_data, expect_status=201)
            if response and "user_id" in response:
                user_id = response["user_id"]
                self.instructor_ids[instructor["email"]] = user_id
                print_success(f"강사 생성: {instructor['title']} ({instructor['email']}) (ID: {user_id})")
                success_count += 1
            else:
                # 생성 실패 → 로그인으로 user_id 조회
                login_data = {"email": instructor["email"], "password": instructor["password"]}
                login_response = self._make_request("POST", "/auth/login", login_data)
                if login_response and "user_id" in login_response:
                    user_id = login_response["user_id"]
                    self.instructor_ids[instructor["email"]] = user_id
                    print_info(f"기존 강사 로그인: {instructor['title']} ({instructor['email']}) (ID: {user_id})")
                    success_count += 1
                else:
                    print_error(f"강사 생성/로그인 실패: {instructor['title']} ({instructor['email']})")

        print_success(f"총 {success_count}/{len(instructors_data)}명 강사 생성 완료")
        return success_count == len(instructors_data)

    def step7_create_mentors(self):
        """Step 7: 멘토 계정 3개 생성"""
        print_step(7, "멘토 계정 3개 생성")

        mentors_data = [
            {"email": "mentor1@icarus.com", "password": "icarus1234", "title": "최멘토"},
            {"email": "mentor2@icarus.com", "password": "icarus1234", "title": "강멘토"},
            {"email": "mentor3@icarus.com", "password": "icarus1234", "title": "윤멘토"}
        ]

        success_count = 0
        for mentor in mentors_data:
            register_data = {
                "email": mentor["email"],
                "password": mentor["password"],
                "name": mentor["title"],
                "role": "mentor"
            }

            # 생성 시도
            response = self._make_request("POST", "/auth/register", register_data, expect_status=201)
            if response and "user_id" in response:
                user_id = response["user_id"]
                self.mentor_ids[mentor["email"]] = user_id
                print_success(f"멘토 생성: {mentor['title']} ({mentor['email']}) (ID: {user_id})")
                success_count += 1
            else:
                # 생성 실패 → 로그인으로 user_id 조회
                login_data = {"email": mentor["email"], "password": mentor["password"]}
                login_response = self._make_request("POST", "/auth/login", login_data)
                if login_response and "user_id" in login_response:
                    user_id = login_response["user_id"]
                    self.mentor_ids[mentor["email"]] = user_id
                    print_info(f"기존 멘토 로그인: {mentor['title']} ({mentor['email']}) (ID: {user_id})")
                    success_count += 1
                else:
                    print_error(f"멘토 생성/로그인 실패: {mentor['title']} ({mentor['email']})")

        print_success(f"총 {success_count}/{len(mentors_data)}명 멘토 생성 완료")
        return success_count == len(mentors_data)

    def step8_create_students(self):
        """Step 8: 학생 계정 15개 생성"""
        print_step(8, "학생 계정 15개 생성")

        students_data = [
            # mentor1 담당
            {"email": "student01@icarus.com", "password": "icarus1234", "title": "학생01", "mentor": "mentor1@icarus.com"},
            {"email": "student02@icarus.com", "password": "icarus1234", "title": "학생02", "mentor": "mentor1@icarus.com"},
            {"email": "student03@icarus.com", "password": "icarus1234", "title": "학생03", "mentor": "mentor1@icarus.com"},
            {"email": "student04@icarus.com", "password": "icarus1234", "title": "학생04", "mentor": "mentor1@icarus.com"},
            {"email": "student05@icarus.com", "password": "icarus1234", "title": "학생05", "mentor": "mentor1@icarus.com"},
            # mentor2 담당
            {"email": "student06@icarus.com", "password": "icarus1234", "title": "학생06", "mentor": "mentor2@icarus.com"},
            {"email": "student07@icarus.com", "password": "icarus1234", "title": "학생07", "mentor": "mentor2@icarus.com"},
            {"email": "student08@icarus.com", "password": "icarus1234", "title": "학생08", "mentor": "mentor2@icarus.com"},
            {"email": "student09@icarus.com", "password": "icarus1234", "title": "학생09", "mentor": "mentor2@icarus.com"},
            {"email": "student10@icarus.com", "password": "icarus1234", "title": "학생10", "mentor": "mentor2@icarus.com"},
            # mentor3 담당
            {"email": "student11@icarus.com", "password": "icarus1234", "title": "학생11", "mentor": "mentor3@icarus.com"},
            {"email": "student12@icarus.com", "password": "icarus1234", "title": "학생12", "mentor": "mentor3@icarus.com"},
            {"email": "student13@icarus.com", "password": "icarus1234", "title": "학생13", "mentor": "mentor3@icarus.com"},
            {"email": "student14@icarus.com", "password": "icarus1234", "title": "학생14", "mentor": "mentor3@icarus.com"},
            {"email": "student15@icarus.com", "password": "icarus1234", "title": "학생15", "mentor": "mentor3@icarus.com"}
        ]

        success_count = 0
        for student in students_data:
            register_data = {
                "email": student["email"],
                "password": student["password"],
                "name": student["title"],
                "role": "student"
            }

            # 생성 시도
            response = self._make_request("POST", "/auth/register", register_data, expect_status=201)
            if response and "user_id" in response:
                user_id = response["user_id"]
                self.student_ids[student["email"]] = user_id
                print_success(f"학생 생성: {student['title']} ({student['email']}) (ID: {user_id})")
                success_count += 1
            else:
                # 생성 실패 → 로그인으로 user_id 조회
                login_data = {"email": student["email"], "password": student["password"]}
                login_response = self._make_request("POST", "/auth/login", login_data)
                if login_response and "user_id" in login_response:
                    user_id = login_response["user_id"]
                    self.student_ids[student["email"]] = user_id
                    print_info(f"기존 학생 로그인: {student['title']} ({student['email']}) (ID: {user_id})")
                    success_count += 1
                else:
                    print_error(f"학생 생성/로그인 실패: {student['title']} ({student['email']})")

        print_success(f"총 {success_count}/{len(students_data)}명 학생 생성 완료")
        return success_count == len(students_data)

    def step9_assign_instructors_to_courses(self):
        """Step 9: 강사-과정 배정"""
        print_step(9, "강사-과정 배정")

        assignments = [
            ("instructor1@icarus.com", ["프론트엔드 개발자 과정", "백엔드 개발자 과정"]),
            ("instructor2@icarus.com", ["보안 전문가 과정", "빅데이터 분석 과정"]),
            ("instructor3@icarus.com", ["AI 활용 과정"])
        ]

        success_count = 0
        total_count = 0

        for instructor_email, course_names in assignments:
            instructor_id = self.instructor_ids.get(instructor_email)
            if not instructor_id:
                print_error(f"강사를 찾을 수 없음: {instructor_email}")
                continue

            for course_name in course_names:
                course_id = self.course_ids.get(course_name)
                if not course_id:
                    print_error(f"과정을 찾을 수 없음: {course_name}")
                    continue

                assign_data = {"instructor_id": instructor_id}
                response = self._make_request("POST", f"/courses/{course_id}/assign-instructor",
                                            assign_data, token=self.admin_token, expect_status=201)
                if response:
                    print_success(f"강사 배정: {course_name} → {instructor_email.split('@')[0]}")
                    success_count += 1
                else:
                    print_error(f"강사 배정 실패: {course_name} → {instructor_email}")

                total_count += 1

        print_success(f"총 {success_count}/{total_count}개 강사-과정 배정 완료")
        return success_count == total_count

    def step10_assign_students_to_courses(self):
        """Step 10: 학생-과정 배정 (각 학생 2개 과정씩)"""
        print_step(10, "학생-과정 배정 (각 학생 2개 과정씩)")

        course_names = list(self.course_ids.keys())
        success_count = 0
        total_count = 0

        for student_email, student_id in self.student_ids.items():
            # 각 학생에 2개 과정 배정
            assigned_courses = course_names[:2]  # 처음 2개 과정

            for course_name in assigned_courses:
                course_id = self.course_ids.get(course_name)
                if not course_id:
                    print_error(f"과정을 찾을 수 없음: {course_name}")
                    continue

                enroll_data = {"student_id": student_id, "session_id": f"session-{student_id}-{random.randint(1000,9999)}", "course_id": course_id}
                response = self._make_request("POST", "/student-courses",
                                            enroll_data, token=self.admin_token, expect_status=201)
                if response:
                    success_count += 1
                else:
                    print_error(f"학생 과정 등록 실패: {student_email} → {course_name}")

                total_count += 1

        print_success(f"총 {success_count}/{total_count}개 학생-과정 배정 완료")
        return success_count == total_count

    def step11_create_user_profiles(self):
        """Step 11: 학생 user_profile 더미 데이터 생성"""
        print_step(11, "학생 user_profile 더미 데이터 생성")

        categories = ['#Logic', '#UX', '#Planning', '#Data']
        top_categories = ['게임', '패션', '의료', '커머스']
        success_count = 0
        total_count = 0

        for email, user_id in self.student_ids.items():
            # 더미 데이터 생성
            logic_avg = random.randint(20, 80)
            planning_avg = random.randint(20, 80)
            ux_avg = random.randint(20, 80)
            data_avg = random.randint(20, 80)
            session_count = random.randint(3, 12)

            career_identity = random.sample(categories, random.randint(1, 2))

            top_category = random.choice(top_categories)

            top_keywords_list = [f"keyword_{i}" for i in range(random.randint(3, 5))]
            keyword_freq_dict = {kw: random.randint(1, 10) for kw in top_keywords_list}

            interest_profile = {
                "top_category": top_category,
                "category_counts": {top_category: random.randint(5, 15)},
                "top_keywords": top_keywords_list,
                "keyword_freq": keyword_freq_dict,
            }

            # POST /v1/user/profile/{user_id} 호출
            profile_data = {
                "logic_avg": logic_avg,
                "planning_avg": planning_avg,
                "ux_avg": ux_avg,
                "data_avg": data_avg,
                "session_count": session_count,
                "career_identity": career_identity,
                "interest_profile": interest_profile,
            }

            response = self._make_request("POST", f"/user/profile/{user_id}",
                                        profile_data, token=self.admin_token, expect_status=201)
            if response:
                print_success(f"User profile 생성: {email} (ID: {user_id})")
                success_count += 1
            else:
                print_error(f"User profile 생성 실패: {email} (ID: {user_id})")

            total_count += 1

        print_success(f"총 {success_count}/{total_count}개 user_profile 생성 완료")
        return success_count == total_count

    def step12_assign_students_to_mentors(self):
        """Step 12: 멘토-학생 배정"""
        print_step(12, "멘토-학생 배정")

        success_count = 0
        total_count = 0

        # 학생-멘토 매핑 (처음 5명: mentor1, 다음 5명: mentor2, 나머지 5명: mentor3)
        mentor_emails = list(self.mentor_ids.keys())
        student_list = list(self.student_ids.items())

        for idx, (student_email, student_id) in enumerate(student_list):
            mentor_email = mentor_emails[idx // 5]  # 5명씩 같은 멘토에 배정
            mentor_id = self.mentor_ids.get(mentor_email)

            if not mentor_id:
                print_error(f"멘토를 찾을 수 없음: {mentor_email}")
                continue

            # 멘토 로그인하여 토큰 획득
            mentor_login_data = {
                "email": mentor_email,
                "password": "icarus1234"
            }

            login_response = self._make_request("POST", "/auth/login", mentor_login_data)
            if not login_response or "access_token" not in login_response:
                print_error(f"멘토 로그인 실패: {mentor_email}")
                continue

            mentor_token = login_response["access_token"]

            assign_data = {"student_id": student_id, "session_id": f"session-{student_id}-{random.randint(1000,9999)}", "mentor_id": mentor_id}
            response = self._make_request("POST", "/mentor/students",
                                        assign_data, token=mentor_token, expect_status=201)
            if response:
                print_success(f"학생 배정: {student_email} → {mentor_email.split('@')[0]}")
                success_count += 1
            else:
                print_error(f"학생 배정 실패: {student_email} → {mentor_email}")

            total_count += 1

        print_success(f"총 {success_count}/{total_count}개 멘토-학생 배정 완료")
        return success_count == total_count

    def step13_create_micro_projects(self):
        """Step 13: 학생별 마이크로 프로젝트 생성"""
        print_step(13, "학생별 마이크로 프로젝트 생성")

        templates = ["java", "python", "node"]
        interest_categories = ["게임", "패션", "의료", "커머스", "교육"]
        project_names = [
            "이커머스 플랫폼", "SNS 앱", "블로그 시스템", "채팅 앱", "날씨 앱",
            "투두 앱", "포트폴리오 사이트", "영화 정보 사이트", "게임 스코어 보드", "실시간 알림 시스템"
        ]

        success_count = 0
        total_count = 0
        student_list = list(self.student_ids.items())

        # 5명당 2~3개 프로젝트 생성
        for group_idx in range(0, len(student_list), 5):
            group_students = student_list[group_idx:group_idx + 5]
            num_projects = random.randint(2, 3)

            for _ in range(num_projects):
                for student_email, student_id in group_students:
                    harness_total = random.randint(3, 6)
                    harness_filled = random.randint(0, harness_total)  # 완성 또는 진행 중

                    project_data = {
                        "user_id": student_id, "session_id": f"session-{student_id}-{random.randint(1000,9999)}",
                        "name": random.choice(project_names),
                        "template": random.choice(templates),
                        "interest_category": random.choice(interest_categories),
                        "harness_total": harness_total,
                        "harness_filled": harness_filled,
                    }

                    response = self._make_request("POST", "/micro-projects",
                                                project_data, token=self.admin_token, expect_status=201)
                    if response:
                        print_success(f"프로젝트 생성: {student_email} → {project_data['name']} ({harness_filled}/{harness_total})")
                        success_count += 1
                    else:
                        print_error(f"프로젝트 생성 실패: {student_email}")

                    total_count += 1

        print_success(f"총 {success_count}/{total_count}개 마이크로 프로젝트 생성 완료")
        return True  # 실패해도 계속 진행

    def run(self):
        """전체 시딩 프로세스 실행"""
        print(f"\n{BOLD}=== ICARUS 더미 데이터 생성 스크립트 ==={RESET}")
        print(f"Base URL: {BLUE}{BASE_URL}{RESET}\n")

        steps = [
            ("Admin 로그인", self.step1_admin_login),
            ("기존 데이터 정리", self.step2_cleanup_courses),
            ("과정 5개 생성", self.step3_create_courses),
            ("단원 생성", self.step4_create_units),
            ("섹션 생성", self.step5_create_sections),
            ("강사 계정 생성", self.step6_create_instructors),
            ("멘토 계정 생성", self.step7_create_mentors),
            ("학생 계정 생성", self.step8_create_students),
            ("강사-과정 배정", self.step9_assign_instructors_to_courses),
            ("학생-과정 배정", self.step10_assign_students_to_courses),
            ("User profile 생성", self.step11_create_user_profiles),
            ("멘토-학생 배정", self.step12_assign_students_to_mentors),
            ("마이크로 프로젝트 생성", self.step13_create_micro_projects)
        ]

        results = []
        for step_num, (step_name, step_func) in enumerate(steps, 1):
            try:
                result = step_func()
                results.append((step_name, result))
                if not result:
                    print_error(f"Step {step_num} 실패: {step_name}")
                    # 실패했어도 계속 진행
            except Exception as e:
                print_error(f"Step {step_num} 예외 발생: {str(e)}")
                results.append((step_name, False))

        # 최종 리포트
        print(f"\n{BOLD}=== 최종 실행 리포트 ==={RESET}")
        success_count = sum(1 for _, result in results if result)
        total_count = len(results)

        for step_name, result in results:
            status = f"{GREEN}성공{RESET}" if result else f"{RED}실패{RESET}"
            print(f"  {step_name}: {status}")

        print(f"\n{BOLD}전체: {success_count}/{total_count} 단계 완료{RESET}")

        if success_count == total_count:
            print(f"\n{GREEN}{BOLD}모든 데이터 생성이 완료되었습니다!{RESET}")
            return True
        else:
            print(f"\n{RED}{BOLD}일부 단계에서 오류가 발생했습니다.{RESET}")
            return False

if __name__ == "__main__":
    seeder = IcarusSeeder()
    success = seeder.run()
    exit(0 if success else 1)
