// 提交表单页面的应用逻辑
angular.module('SubmitApp', [])
.controller('SubmitController', ['$scope', '$timeout', function($scope, $timeout) {
    
    // 初始化
    $scope.loading = true;
    $scope.form = null;
    $scope.answers = [];
    $scope.submitted = false;
    $scope.submitting = false;
    
    // 获取URL参数
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
    
    // 获取表单ID
    var formId = getUrlParameter('id');
    
    // 加载表单数据
    function loadForm() {
        $timeout(function() {
            if (!formId) {
                $scope.loading = false;
                return;
            }
            
            var forms = JSON.parse(localStorage.getItem('quizForms')) || [];
            $scope.form = forms.find(function(form) {
                return form.id === formId;
            });
            
            if ($scope.form) {
                // 初始化答案数组
                $scope.answers = [];
                for (var i = 0; i < $scope.form.questions.length; i++) {
                    var question = $scope.form.questions[i];
                    if (question.type === 'multiple') {
                        $scope.answers[i] = {
                            value: [],
                            selected: {}
                        };
                    } else {
                        $scope.answers[i] = {
                            value: question.type === 'number' ? null : ''
                        };
                    }
                }
            }
            
            $scope.loading = false;
        }, 500); // 模拟加载时间
    }
    
    // 获取类型标签
    $scope.getTypeLabel = function(type) {
        var labels = {
            'quiz': '测验',
            'assignment': '作业',
            'survey': '调查'
        };
        return labels[type] || type;
    };
    
    // 重置答案
    $scope.resetAnswers = function() {
        if (confirm('确定要重置所有答案吗？')) {
            for (var i = 0; i < $scope.answers.length; i++) {
                var question = $scope.form.questions[i];
                if (question.type === 'multiple') {
                    $scope.answers[i] = {
                        value: [],
                        selected: {}
                    };
                } else {
                    $scope.answers[i] = {
                        value: question.type === 'number' ? null : ''
                    };
                }
            }
        }
    };
    
    // 重置表单（重新填写）
    $scope.resetForm = function() {
        $scope.submitted = false;
        $scope.resetAnswers();
    };
    
    // 提交表单
    $scope.submitForm = function() {
        if ($scope.submitting) return;
        
        // 验证必填字段
        for (var i = 0; i < $scope.form.questions.length; i++) {
            var question = $scope.form.questions[i];
            var answer = $scope.answers[i];
            
            if (question.required) {
                if (question.type === 'multiple') {
                    var hasSelection = false;
                    for (var key in answer.selected) {
                        if (answer.selected[key]) {
                            hasSelection = true;
                            break;
                        }
                    }
                    if (!hasSelection) {
                        alert('请完成第 ' + (i + 1) + ' 题的答案');
                        return;
                    }
                } else {
                    if (!answer.value && answer.value !== 0) {
                        alert('请完成第 ' + (i + 1) + ' 题的答案');
                        return;
                    }
                }
            }
        }
        
        $scope.submitting = true;
        
        // 模拟网络提交延迟
        $timeout(function() {
            // 处理多选题答案
            var processedAnswers = {};
            for (var i = 0; i < $scope.answers.length; i++) {
                var question = $scope.form.questions[i];
                var answer = $scope.answers[i];
                
                if (question.type === 'multiple') {
                    var selectedOptions = [];
                    for (var j = 0; j < question.options.length; j++) {
                        if (answer.selected[j]) {
                            selectedOptions.push({
                                value: question.options[j].value,
                                text: question.options[j].text
                            });
                        }
                    }
                    processedAnswers[i] = {
                        value: selectedOptions,
                        type: 'multiple'
                    };
                } else if (question.type === 'choice') {
                    var selectedOption = question.options.find(function(opt) {
                        return opt.value === answer.value;
                    });
                    processedAnswers[i] = {
                        value: answer.value,
                        text: selectedOption ? selectedOption.text : '',
                        type: 'choice'
                    };
                } else {
                    processedAnswers[i] = {
                        value: answer.value,
                        type: question.type
                    };
                }
            }
            
            // 创建提交记录
            var submission = {
                id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                submittedAt: new Date(),
                answers: processedAnswers,
                userAgent: navigator.userAgent
            };
            
            // 保存到本地存储
            var forms = JSON.parse(localStorage.getItem('quizForms')) || [];
            var formIndex = forms.findIndex(function(form) {
                return form.id === formId;
            });
            
            if (formIndex !== -1) {
                forms[formIndex].submissions.push(submission);
                localStorage.setItem('quizForms', JSON.stringify(forms));
            }
            
            $scope.submitting = false;
            $scope.submitted = true;
        }, 1000);
    };
    
    // 监听多选题变化，更新答案值
    $scope.$watch('answers', function(newAnswers) {
        if (newAnswers && $scope.form) {
            for (var i = 0; i < newAnswers.length; i++) {
                var question = $scope.form.questions[i];
                if (question && question.type === 'multiple' && newAnswers[i]) {
                    var selectedValues = [];
                    for (var j = 0; j < question.options.length; j++) {
                        if (newAnswers[i].selected && newAnswers[i].selected[j]) {
                            selectedValues.push(question.options[j].value);
                        }
                    }
                    newAnswers[i].value = selectedValues;
                }
            }
        }
    }, true);
    
    // 页面加载时执行
    loadForm();
    
    // 页面离开前提醒
    window.addEventListener('beforeunload', function(e) {
        if (!$scope.submitted && $scope.form) {
            // 检查是否有未保存的答案
            var hasAnswers = false;
            for (var i = 0; i < $scope.answers.length; i++) {
                var answer = $scope.answers[i];
                if (answer.value && answer.value !== '' && answer.value !== null) {
                    hasAnswers = true;
                    break;
                }
            }
            
            if (hasAnswers) {
                e.preventDefault();
                e.returnValue = '您有未提交的答案，确定要离开吗？';
                return e.returnValue;
            }
        }
    });
}]);